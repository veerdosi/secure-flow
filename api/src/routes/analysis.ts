import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { getDb } from '../services/firebase';
import gitlabService from '../services/gitlab';
import aiAnalysisService from '../services/aiAnalysis';
import logger from '../utils/logger';

const router = Router();

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: string;
  };
}

// Start new analysis
router.post('/start',
  [
    body('projectId').notEmpty().withMessage('Project ID is required'),
    body('commitHash').optional().isString(),
    body('scanTypes').optional().isArray(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId, commitHash, scanTypes = ['STATIC_ANALYSIS'] } = req.body;
      const db = getDb();

      // Create analysis record
      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const analysis = {
        id: analysisId,
        projectId,
        commitHash: commitHash || 'latest',
        timestamp: new Date().toISOString(),
        status: 'PENDING',
        securityScore: 0,
        threatLevel: 'UNKNOWN',
        vulnerabilities: [],
        scanTypes,
        userId: req.user?.uid,
        createdAt: new Date().toISOString(),
      };

      await db.collection('analyses').doc(analysisId).set(analysis);

      // Start background analysis
      processAnalysis(analysisId, projectId, commitHash).catch(error => {
        logger.error('Background analysis failed:', error);
      });

      res.status(202).json({
        message: 'Analysis started',
        analysisId,
        status: 'PENDING',
      });
    } catch (error) {
      logger.error('Failed to start analysis:', error);
      res.status(500).json({ error: 'Failed to start analysis' });
    }
  }
);

// Get analysis status and results
router.get('/:analysisId',
  param('analysisId').notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { analysisId } = req.params;
      const db = getDb();

      const doc = await db.collection('analyses').doc(analysisId).get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Analysis not found' });
      }

      const analysis = doc.data();
      res.json(analysis);
    } catch (error) {
      logger.error('Failed to get analysis:', error);
      res.status(500).json({ error: 'Failed to retrieve analysis' });
    }
  }
);

// Get project analyses
router.get('/project/:projectId',
  param('projectId').notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const db = getDb();

      const snapshot = await db
        .collection('analyses')
        .where('projectId', '==', projectId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const analyses = snapshot.docs.map(doc => doc.data());
      res.json(analyses);
    } catch (error) {
      logger.error('Failed to get project analyses:', error);
      res.status(500).json({ error: 'Failed to retrieve project analyses' });
    }
  }
);

// Background analysis processing
async function processAnalysis(analysisId: string, projectId: string, commitHash?: string) {
  const db = getDb();

  try {
    // Update status to IN_PROGRESS
    await db.collection('analyses').doc(analysisId).update({
      status: 'IN_PROGRESS',
      stage: 'FETCHING_CODE',
      progress: 10,
    });

    // Get project files
    const files = await gitlabService.getProjectFiles(projectId, commitHash);
    logger.info(`Found ${files.length} code files for analysis`);

    await db.collection('analyses').doc(analysisId).update({
      stage: 'STATIC_ANALYSIS',
      progress: 30,
    });

    // Analyze files
    const allVulnerabilities = [];
    let totalScore = 0;
    let fileCount = 0;

    for (const file of files.slice(0, 10)) { // Limit for demo
      try {
        const content = await gitlabService.getFileContent(projectId, file.path, commitHash);
        const aiResult = await aiAnalysisService.analyzeCode(content, file.path);

        if (aiResult.vulnerabilities) {
          allVulnerabilities.push(...aiResult.vulnerabilities.map((v: any) => ({
            ...v,
            file: file.path,
            id: `vuln_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          })));
        }

        totalScore += aiResult.securityScore || 50;
        fileCount++;
      } catch (error) {
        logger.warn(`Failed to analyze file ${file.path}:`, error);
      }
    }

    await db.collection('analyses').doc(analysisId).update({
      stage: 'AI_ANALYSIS',
      progress: 60,
    });

    // Generate threat model
    const threatModel = await aiAnalysisService.generateThreatModel(
      files.map(f => f.path),
      { projectId, fileCount: files.length }
    );

    await db.collection('analyses').doc(analysisId).update({
      stage: 'THREAT_MODELING',
      progress: 80,
    });

    // Calculate final scores
    const avgScore = fileCount > 0 ? Math.round(totalScore / fileCount) : 50;
    const threatLevel = allVulnerabilities.some(v => v.severity === 'CRITICAL') ? 'CRITICAL' :
                       allVulnerabilities.some(v => v.severity === 'HIGH') ? 'HIGH' :
                       allVulnerabilities.some(v => v.severity === 'MEDIUM') ? 'MEDIUM' : 'LOW';

    // Generate remediation steps
    const remediationSteps = await aiAnalysisService.generateRemediationSteps(allVulnerabilities);

    // Final update
    await db.collection('analyses').doc(analysisId).update({
      status: 'COMPLETED',
      stage: 'COMPLETED',
      progress: 100,
      securityScore: avgScore,
      threatLevel,
      vulnerabilities: allVulnerabilities,
      threatModel,
      remediationSteps,
      aiAnalysis: `Analysis completed. Found ${allVulnerabilities.length} vulnerabilities across ${fileCount} files.`,
      complianceScore: {
        owasp: Math.max(0, (avgScore - 20) / 80),
        pci: Math.max(0, (avgScore - 30) / 70),
        sox: Math.max(0, (avgScore - 25) / 75),
        gdpr: Math.max(0, (avgScore - 15) / 85),
        iso27001: Math.max(0, (avgScore - 20) / 80),
      },
      completedAt: new Date().toISOString(),
    });

    logger.info(`Analysis ${analysisId} completed successfully`);
  } catch (error) {
    logger.error(`Analysis ${analysisId} failed:`, error);

    await db.collection('analyses').doc(analysisId).update({
      status: 'FAILED',
      error: error.message,
      failedAt: new Date().toISOString(),
    });
  }
}

export default router;
