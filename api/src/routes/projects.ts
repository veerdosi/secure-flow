import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Project, Analysis } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import gitlabService from '../services/gitlab';
import logger from '../utils/logger';

const router = Router();

// Get all projects for user
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projects = await Project.find({ createdBy: req.user?._id });
    res.json(projects);
  } catch (error) {
    logger.error('Failed to get projects:', error);
    res.status(500).json({ error: 'Failed to retrieve projects' });
  }
});

// Get specific project
router.get('/:projectId',
  param('projectId').notEmpty(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId } = req.params;

      const project = await Project.findOne({
        gitlabProjectId: projectId,
        createdBy: req.user?._id
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

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
    body('webhookSecret').notEmpty().withMessage('Webhook secret is required'),
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
        webhookSecret,
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

      // Check if project already exists
      const existingProject = await Project.findOne({ gitlabProjectId });
      if (existingProject) {
        return res.status(409).json({ error: 'Project already configured' });
      }

      // Create webhook in GitLab
      let webhookId;
      try {
        const webhookUrl = `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/webhooks/gitlab`;
        const webhook = await gitlabService.createWebhook(gitlabProjectId, req.user!._id, webhookUrl, webhookSecret);
        webhookId = webhook.id;
      } catch (webhookError) {
        logger.warn('Failed to create GitLab webhook:', webhookError);
        // Continue without webhook for now
      }

      const project = new Project({
        name,
        gitlabProjectId,
        repositoryUrl,
        branch,
        scanFrequency,
        notificationSettings,
        excludePaths,
        scanTypes,
        complianceFrameworks,
        webhookSecret,
        webhookId,
        createdBy: req.user?._id,
      });

      await project.save();

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

      // Remove fields that shouldn't be updated
      delete updates._id;
      delete updates.gitlabProjectId;
      delete updates.createdBy;
      delete updates.createdAt;

      const project = await Project.findOneAndUpdate(
        { gitlabProjectId: projectId, createdBy: req.user?._id },
        { ...updates, updatedAt: new Date() },
        { new: true }
      );

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      logger.info(`Project ${projectId} updated successfully`);

      res.json({
        message: 'Project updated successfully',
        project,
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

      const project = await Project.findOne({
        gitlabProjectId: projectId,
        createdBy: req.user?._id
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Delete GitLab webhook if exists
      if (project.webhookId) {
        try {
          await gitlabService.deleteWebhook(projectId, req.user!._id, project.webhookId);
        } catch (webhookError) {
          logger.warn('Failed to delete GitLab webhook:', webhookError);
        }
      }

      await Project.findByIdAndDelete(project._id);

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
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId } = req.params;

      // Verify project belongs to user
      const project = await Project.findOne({
        gitlabProjectId: projectId,
        createdBy: req.user?._id
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Get recent analyses
      const analyses = await Analysis.find({ projectId })
        .sort({ createdAt: -1 })
        .limit(30);

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
          date: a.createdAt,
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
