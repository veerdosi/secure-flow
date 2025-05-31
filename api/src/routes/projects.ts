import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { getDb } from '../services/firebase';
import gitlabService from '../services/gitlab';
import { requireRole } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: string;
  };
}

// Get all projects for user
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('projects').get();
    const projects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(projects);
  } catch (error) {
    logger.error('Failed to get projects:', error);
    res.status(500).json({ error: 'Failed to retrieve projects' });
  }
});

// Get specific project
router.get('/:projectId',
  param('projectId').notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId } = req.params;
      const db = getDb();

      const doc = await db.collection('projects').doc(projectId).get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const project = { id: doc.id, ...doc.data() };
      res.json(project);
    } catch (error) {
      logger.error('Failed to get project:', error);
      res.status(500).json({ error: 'Failed to retrieve project' });
    }
  }
);

// Create new project configuration
router.post('/',
  requireRole('DEVELOPER'),
  [
    body('name').notEmpty().withMessage('Project name is required'),
    body('gitlabProjectId').notEmpty().withMessage('GitLab project ID is required'),
    body('repositoryUrl').isURL().withMessage('Valid repository URL is required'),
    body('branch').optional().isString(),
    body('scanFrequency').isIn(['ON_PUSH', 'DAILY', 'WEEKLY']).withMessage('Invalid scan frequency'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        name,
        gitlabProjectId,
        repositoryUrl,
        branch = 'main',
        scanFrequency = 'ON_PUSH',
        notificationSettings = {
          email: true,
          slack: false,
          webhook: false,
          emailAddresses: [req.user?.email],
          minSeverity: 'MEDIUM'
        },
        excludePaths = ['node_modules/', 'dist/', 'build/'],
        scanTypes = ['STATIC_ANALYSIS', 'DEPENDENCY_SCAN'],
        complianceFrameworks = ['OWASP']
      } = req.body;

      const db = getDb();

      // Check if project already exists
      const existingDoc = await db.collection('projects').doc(gitlabProjectId).get();
      if (existingDoc.exists) {
        return res.status(409).json({ error: 'Project already configured' });
      }

      // Create webhook in GitLab
      let webhookId;
      try {
        const webhookUrl = `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/webhooks/gitlab`;
        const webhook = await gitlabService.createWebhook(gitlabProjectId, webhookUrl);
        webhookId = webhook.id;
      } catch (webhookError) {
        logger.warn('Failed to create GitLab webhook:', webhookError);
        // Continue without webhook for now
      }

      const project = {
        id: gitlabProjectId,
        name,
        gitlabProjectId,
        repositoryUrl,
        branch,
        scanFrequency,
        notificationSettings,
        excludePaths,
        scanTypes,
        complianceFrameworks,
        webhookId,
        createdBy: req.user?.uid,
        createdAt: new Date().toISOString(),
        lastScanDate: null,
      };

      await db.collection('projects').doc(gitlabProjectId).set(project);

      logger.info(`Project ${name} configured successfully`, { projectId: gitlabProjectId });

      res.status(201).json({
        message: 'Project configured successfully',
        project,
      });
    } catch (error) {
      logger.error('Failed to create project:', error);
      res.status(500).json({ error: 'Failed to configure project' });
    }
  }
);

// Update project configuration
router.put('/:projectId',
  requireRole('DEVELOPER'),
  [
    param('projectId').notEmpty(),
    body('name').optional().notEmpty(),
    body('scanFrequency').optional().isIn(['ON_PUSH', 'DAILY', 'WEEKLY']),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId } = req.params;
      const updates = req.body;
      const db = getDb();

      // Remove fields that shouldn't be updated
      delete updates.id;
      delete updates.gitlabProjectId;
      delete updates.createdBy;
      delete updates.createdAt;

      updates.updatedAt = new Date().toISOString();
      updates.updatedBy = req.user?.uid;

      await db.collection('projects').doc(projectId).update(updates);

      logger.info(`Project ${projectId} updated successfully`);

      res.json({
        message: 'Project updated successfully',
        projectId,
      });
    } catch (error) {
      logger.error('Failed to update project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }
);

// Delete project configuration
router.delete('/:projectId',
  requireRole('ADMIN'),
  param('projectId').notEmpty(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId } = req.params;
      const db = getDb();

      // Get project to check for webhook
      const doc = await db.collection('projects').doc(projectId).get();
      if (doc.exists) {
        const project = doc.data();

        // Delete GitLab webhook if exists
        if (project.webhookId) {
          try {
            await gitlabService.deleteWebhook(projectId, project.webhookId);
          } catch (webhookError) {
            logger.warn('Failed to delete GitLab webhook:', webhookError);
          }
        }
      }

      await db.collection('projects').doc(projectId).delete();

      logger.info(`Project ${projectId} deleted successfully`);

      res.json({
        message: 'Project deleted successfully',
        projectId,
      });
    } catch (error) {
      logger.error('Failed to delete project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }
);

// Get project statistics
router.get('/:projectId/stats',
  param('projectId').notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId } = req.params;
      const db = getDb();

      // Get recent analyses
      const snapshot = await db
        .collection('analyses')
        .where('projectId', '==', projectId)
        .orderBy('timestamp', 'desc')
        .limit(30)
        .get();

      const analyses = snapshot.docs.map(doc => doc.data());

      // Calculate statistics
      const stats = {
        totalAnalyses: analyses.length,
        averageSecurityScore: analyses.length > 0
          ? Math.round(analyses.reduce((sum, a) => sum + (a.securityScore || 0), 0) / analyses.length)
          : 0,
        totalVulnerabilities: analyses.reduce((sum, a) => sum + (a.vulnerabilities?.length || 0), 0),
        criticalVulnerabilities: analyses.reduce((sum, a) =>
          sum + (a.vulnerabilities?.filter((v: any) => v.severity === 'CRITICAL').length || 0), 0),
        lastAnalysis: analyses[0] || null,
        trendsLast30Days: analyses.slice(0, 30).map(a => ({
          date: a.timestamp,
          score: a.securityScore,
          vulnerabilities: a.vulnerabilities?.length || 0,
        })),
      };

      res.json(stats);
    } catch (error) {
      logger.error('Failed to get project stats:', error);
      res.status(500).json({ error: 'Failed to retrieve project statistics' });
    }
  }
);

export default router;
