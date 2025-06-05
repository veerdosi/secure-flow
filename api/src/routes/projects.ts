import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Project } from '../models';
import gitlabService from '../services/gitlab';
import logger from '../utils/logger';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const router = Router();

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Get user ID from token
const getUserIdFromToken = (req: AuthenticatedRequest): string => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }
  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
  return decoded.userId;
};

// Get all projects for user
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdFromToken(req);
    
    const projects = await Project.find({ createdBy: userId }).sort({ createdAt: -1 });
    
    res.json(projects);
  } catch (error) {
    logger.error('Failed to get projects:', error);
    res.status(500).json({ error: 'Failed to retrieve projects' });
  }
});

// Get project by ID
router.get('/:id',
  param('id').notEmpty(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = getUserIdFromToken(req);
      const { id } = req.params;

      const project = await Project.findOne({ _id: id, createdBy: userId });

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

// Create new project
router.post('/',
  [
    body('name').notEmpty().withMessage('Project name is required'),
    body('gitlabProjectId').notEmpty().withMessage('GitLab Project ID is required'),
    body('repositoryUrl').isURL().withMessage('Valid repository URL is required'),
    body('branch').optional().isString(),
    body('scanFrequency').isIn(['ON_PUSH', 'DAILY', 'WEEKLY']).withMessage('Invalid scan frequency'),
    body('notificationEmail').isEmail().withMessage('Valid notification email is required'),
    body('scanTypes').isArray().withMessage('Scan types must be an array'),
    body('webhookSecret').notEmpty().withMessage('Webhook secret is required'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = getUserIdFromToken(req);
      const {
        name,
        gitlabProjectId,
        repositoryUrl,
        branch = 'main',
        scanFrequency,
        notificationEmail,
        scanTypes,
        webhookSecret,
        notificationSettings
      } = req.body;

      // Check if project with same GitLab ID already exists for this user
      const existingProject = await Project.findOne({
        gitlabProjectId,
        createdBy: userId
      });

      if (existingProject) {
        return res.status(409).json({ error: 'Project with this GitLab ID already exists' });
      }

      // Validate GitLab project access
      try {
        await gitlabService.validateProjectAccess(gitlabProjectId, userId);
      } catch (error: any) {
        logger.error('GitLab project validation failed:', error);
        return res.status(400).json({ 
          error: 'Unable to access GitLab project. Please check your GitLab settings and project ID.' 
        });
      }

      // Create project
      const project = new Project({
        name,
        gitlabProjectId,
        repositoryUrl,
        branch,
        scanFrequency,
        notificationSettings: notificationSettings || {
          email: true,
          slack: false,
          webhook: false,
          emailAddresses: [notificationEmail],
          minSeverity: 'MEDIUM'
        },
        excludePaths: [],
        scanTypes: scanTypes || ['STATIC_ANALYSIS', 'DEPENDENCY_SCAN', 'SECRET_SCAN'],
        complianceFrameworks: ['OWASP', 'PCI'],
        webhookSecret,
        createdBy: userId,
      });

      await project.save();

      // Try to create GitLab webhook (optional - don't fail if this fails)
      try {
        const webhookUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/api/webhooks/gitlab`;
        const webhookId = await gitlabService.createWebhook(
          gitlabProjectId,
          userId,
          webhookUrl,
          webhookSecret
        );
        
        project.webhookId = webhookId;
        await project.save();
        
        logger.info(`Webhook created for project ${project._id}: ${webhookId}`);
      } catch (webhookError) {
        logger.warn('Failed to create GitLab webhook (project still created):', webhookError);
        // Don't fail the project creation if webhook setup fails
      }

      logger.info(`Project created: ${project._id} by user ${userId}`);

      res.status(201).json({
        message: 'Project created successfully',
        project,
      });
    } catch (error) {
      logger.error('Failed to create project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
);

// Update project
router.put('/:id',
  [
    param('id').notEmpty(),
    body('name').optional().notEmpty().withMessage('Project name cannot be empty'),
    body('branch').optional().isString(),
    body('scanFrequency').optional().isIn(['ON_PUSH', 'DAILY', 'WEEKLY']),
    body('notificationSettings').optional().isObject(),
    body('excludePaths').optional().isArray(),
    body('scanTypes').optional().isArray(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = getUserIdFromToken(req);
      const { id } = req.params;

      const project = await Project.findOne({ _id: id, createdBy: userId });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Update allowed fields
      const allowedUpdates = [
        'name', 'branch', 'scanFrequency', 'notificationSettings', 
        'excludePaths', 'scanTypes', 'complianceFrameworks'
      ];
      
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          (project as any)[field] = req.body[field];
        }
      });

      await project.save();

      logger.info(`Project updated: ${project._id} by user ${userId}`);

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

// Delete project
router.delete('/:id',
  param('id').notEmpty(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = getUserIdFromToken(req);
      const { id } = req.params;

      const project = await Project.findOne({ _id: id, createdBy: userId });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Try to delete GitLab webhook if it exists
      if (project.webhookId) {
        try {
          await gitlabService.deleteWebhook(
            project.gitlabProjectId,
            userId,
            project.webhookId
          );
          logger.info(`Webhook deleted for project ${project._id}: ${project.webhookId}`);
        } catch (webhookError) {
          logger.warn('Failed to delete GitLab webhook:', webhookError);
          // Don't fail the project deletion if webhook deletion fails
        }
      }

      await Project.findByIdAndDelete(id);

      logger.info(`Project deleted: ${id} by user ${userId}`);

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      logger.error('Failed to delete project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }
);

// Get project files
router.get('/:id/files',
  param('id').notEmpty(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = getUserIdFromToken(req);
      const { id } = req.params;
      const { branch } = req.query;

      const project = await Project.findOne({ _id: id, createdBy: userId });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const files = await gitlabService.getProjectFiles(
        project.gitlabProjectId,
        userId,
        (branch as string) || project.branch
      );

      res.json(files);
    } catch (error) {
      logger.error('Failed to get project files:', error);
      res.status(500).json({ error: 'Failed to retrieve project files' });
    }
  }
);

// Get file content
router.get('/:id/files/content',
  param('id').notEmpty(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = getUserIdFromToken(req);
      const { id } = req.params;
      const { filePath, branch } = req.query;

      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }

      const project = await Project.findOne({ _id: id, createdBy: userId });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const content = await gitlabService.getFileContent(
        project.gitlabProjectId,
        userId,
        filePath as string,
        (branch as string) || project.branch
      );

      res.json({ content, filePath, branch: (branch as string) || project.branch });
    } catch (error) {
      logger.error('Failed to get file content:', error);
      res.status(500).json({ error: 'Failed to retrieve file content' });
    }
  }
);

// Regenerate webhook secret
router.post('/:id/webhook/regenerate',
  param('id').notEmpty(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = getUserIdFromToken(req);
      const { id } = req.params;

      const project = await Project.findOne({ _id: id, createdBy: userId });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Generate new webhook secret
      const newSecret = crypto.randomBytes(32).toString('hex');
      project.webhookSecret = newSecret;

      // Update GitLab webhook if it exists
      if (project.webhookId) {
        try {
          const webhookUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/api/webhooks/gitlab`;
          await gitlabService.updateWebhook(
            project.gitlabProjectId,
            userId,
            project.webhookId,
            webhookUrl,
            newSecret
          );
          logger.info(`Webhook updated for project ${project._id}: ${project.webhookId}`);
        } catch (webhookError) {
          logger.warn('Failed to update GitLab webhook:', webhookError);
          return res.status(500).json({ error: 'Failed to update webhook in GitLab' });
        }
      }

      await project.save();

      logger.info(`Webhook secret regenerated for project ${project._id} by user ${userId}`);

      res.json({
        message: 'Webhook secret regenerated successfully',
        webhookSecret: newSecret,
      });
    } catch (error) {
      logger.error('Failed to regenerate webhook secret:', error);
      res.status(500).json({ error: 'Failed to regenerate webhook secret' });
    }
  }
);

export default router;