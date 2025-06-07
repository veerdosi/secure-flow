import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Analysis } from '../models';
import remediationService from '../services/remediationService';
import logger from '../utils/logger';
import jwt from 'jsonwebtoken';

const router = Router();

interface AuthenticatedRequest extends Request {
  user?: { uid: string; email: string; role: string; };
}

// Approve/Reject remediation actions
router.post('/:analysisId/approve',
  [
    param('analysisId').notEmpty(),
    body('action').isIn(['APPROVE', 'REJECT', 'PARTIAL']).withMessage('Invalid action'),
    body('approvedActions').optional().isArray(),
    body('rejectedActions').optional().isArray(),
    body('comments').optional().isString(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { analysisId } = req.params;
      const { action, approvedActions = [], rejectedActions = [], comments } = req.body;

      // Get user ID from JWT token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;

      const analysis = await Analysis.findById(analysisId);
      if (!analysis) {
        return res.status(404).json({ error: 'Analysis not found' });
      }

      if (analysis.status !== 'AWAITING_APPROVAL') {
        return res.status(400).json({ error: 'Analysis is not awaiting approval' });
      }

      // Update approval status
      const updateData: any = {
        'humanApproval.comments': comments,
      };

      if (action === 'APPROVE') {
        updateData['humanApproval.status'] = 'APPROVED';
        updateData['humanApproval.approvedBy'] = decoded.userId;
        updateData['humanApproval.approvedAt'] = new Date();
        updateData['humanApproval.approvedActions'] = analysis.proposedRemediations.map(r => r.id);
        updateData['status'] = 'IN_PROGRESS'; // Will be set to COMPLETED after remediation
      } else if (action === 'REJECT') {
        updateData['humanApproval.status'] = 'REJECTED';
        updateData['humanApproval.rejectedBy'] = decoded.userId;
        updateData['humanApproval.rejectedAt'] = new Date();
        updateData['humanApproval.rejectedActions'] = analysis.proposedRemediations.map(r => r.id);
        updateData['status'] = 'COMPLETED';
      } else if (action === 'PARTIAL') {
        updateData['humanApproval.status'] = 'APPROVED';
        updateData['humanApproval.approvedBy'] = decoded.userId;
        updateData['humanApproval.approvedAt'] = new Date();
        updateData['humanApproval.approvedActions'] = approvedActions;
        updateData['humanApproval.rejectedActions'] = rejectedActions;
        updateData['status'] = 'IN_PROGRESS'; // Will be set to COMPLETED after remediation
      }

      await Analysis.findByIdAndUpdate(analysisId, updateData);

      // Start remediation process if approved
      if (action === 'APPROVE' || action === 'PARTIAL') {
        const actionsToExecute = action === 'APPROVE' 
          ? analysis.proposedRemediations.map(r => r.id)
          : approvedActions;
        
        remediationService.executeRemediations(analysisId, actionsToExecute).catch(error => {
          logger.error(`Remediation execution failed for analysis ${analysisId}:`, error);
        });
      }

      res.json({
        message: `Analysis ${action.toLowerCase()}ed successfully`,
        status: updateData.status,
        approvedActions: updateData['humanApproval.approvedActions'] || [],
        rejectedActions: updateData['humanApproval.rejectedActions'] || []
      });
    } catch (error) {
      logger.error('Failed to process approval:', error);
      res.status(500).json({ error: 'Failed to process approval' });
    }
  }
);

// Get remediation preview/diff
router.get('/:analysisId/remediation-preview',
  param('analysisId').notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const { analysisId } = req.params;
      const analysis = await Analysis.findById(analysisId);
      
      if (!analysis) {
        return res.status(404).json({ error: 'Analysis not found' });
      }

      res.json({
        proposedRemediations: analysis.proposedRemediations,
        humanApproval: analysis.humanApproval,
        status: analysis.status
      });
    } catch (error) {
      logger.error('Failed to get remediation preview:', error);
      res.status(500).json({ error: 'Failed to get remediation preview' });
    }
  }
);

export default router;
