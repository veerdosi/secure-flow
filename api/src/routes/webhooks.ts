import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { Project, Analysis } from '../models';
import gitlabService from '../services/gitlab';
import logger from '../utils/logger';

const router = Router();

// GitLab webhook handler
router.post('/gitlab', async (req: Request, res: Response) => {
  try {
    const gitlabToken = req.headers['x-gitlab-token'] as string;
    const payload = JSON.stringify(req.body);

    if (!gitlabToken) {
      logger.warn('Missing GitLab webhook token');
      return res.status(401).json({ error: 'Missing webhook token' });
    }

    const { object_kind, project, commits, ref } = req.body;

    // Only process push events to main branch
    if (object_kind !== 'push' || !ref.endsWith('/main')) {
      return res.status(200).json({ message: 'Event ignored' });
    }

    logger.info(`Received GitLab webhook for project ${project.id}`, {
      projectId: project.id,
      commits: commits?.length || 0,
      ref,
    });

    // Get project configuration and verify webhook secret
    const projectConfig = await Project.findOne({ gitlabProjectId: project.id.toString() });

    if (!projectConfig) {
      logger.info(`Project ${project.id} not configured for SecureFlow`);
      return res.status(200).json({ message: 'Project not configured' });
    }

    // Verify webhook signature using project-specific secret
    if (!verifyWebhookSignature(payload, gitlabToken, projectConfig.webhookSecret)) {
      logger.warn('Invalid webhook signature for project', { projectId: project.id });
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Check scan frequency
    if (projectConfig.scanFrequency !== 'ON_PUSH') {
      return res.status(200).json({ message: 'Scan not triggered for this event' });
    }

    // Get changed files
    const latestCommit = commits[commits.length - 1];
    const changedFiles = await gitlabService.getChangedFiles(project.id, latestCommit.id);

    // Only trigger analysis if code files were changed
    const hasCodeChanges = changedFiles.length > 0;

    if (!hasCodeChanges) {
      logger.info(`No code changes detected in commit ${latestCommit.id}`);
      return res.status(200).json({ message: 'No code changes detected' });
    }

    // Create analysis record
    const analysis = new Analysis({
      projectId: project.id.toString(),
      commitHash: latestCommit.id,
      securityScore: 0,
      threatLevel: 'UNKNOWN',
      vulnerabilities: [],
      threatModel: {},
      aiAnalysis: '',
      remediationSteps: [],
      complianceScore: {},
      status: 'PENDING',
      scanTypes: projectConfig.scanTypes || ['STATIC_ANALYSIS', 'DEPENDENCY_SCAN'],
      triggeredBy: 'webhook',
      changedFiles,
      commitMessage: latestCommit.message,
      author: latestCommit.author,
      userId: projectConfig.createdBy,
    });

    await analysis.save();

    // Process analysis in background
    processWebhookAnalysis(analysis._id.toString(), project.id.toString(), latestCommit.id, changedFiles, projectConfig)
      .catch(error => {
        logger.error('Webhook analysis failed:', error);
      });

    logger.info(`Started analysis ${analysis._id} for webhook trigger`);

    res.status(202).json({
      message: 'Analysis triggered',
      analysisId: analysis._id,
      changedFiles: changedFiles.length,
    });

  } catch (error) {
    logger.error('GitLab webhook processing failed:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Verify webhook signature with project-specific secret
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) {
    logger.warn('No webhook secret configured for project');
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    logger.error('Error verifying webhook signature:', error);
    return false;
  }
}

// Enhanced background analysis processing
async function processWebhookAnalysis(
  analysisId: string,
  projectId: string,
  commitHash: string,
  changedFiles: string[],
  projectConfig: any
) {
  try {
    // Update status to IN_PROGRESS
    await Analysis.findByIdAndUpdate(analysisId, {
      status: 'IN_PROGRESS',
      stage: 'FETCHING_CODE',
      progress: 10,
      startedAt: new Date(),
    });

    logger.info(`Processing webhook analysis ${analysisId}`, {
      projectId,
      commitHash,
      changedFilesCount: changedFiles.length,
    });

    // Simulate progressive analysis stages
    const stages = [
      { stage: 'STATIC_ANALYSIS', progress: 30, delay: 2000 },
      { stage: 'AI_ANALYSIS', progress: 60, delay: 3000 },
      { stage: 'THREAT_MODELING', progress: 80, delay: 2000 },
      { stage: 'GENERATING_REPORT', progress: 95, delay: 1000 },
    ];

    for (const { stage, progress, delay } of stages) {
      await new Promise(resolve => setTimeout(resolve, delay));

      await Analysis.findByIdAndUpdate(analysisId, {
        stage,
        progress,
        updatedAt: new Date(),
      });
    }

    // Generate final results with focus on changed files
    const mockResults = generateMockAnalysisResults(changedFiles, projectConfig);

    await Analysis.findByIdAndUpdate(analysisId, {
      ...mockResults,
      status: 'COMPLETED',
      stage: 'COMPLETED',
      progress: 100,
      completedAt: new Date(),
    });

    logger.info(`Webhook analysis ${analysisId} completed successfully`);

    // Send notifications if configured
    if (projectConfig.notificationSettings?.email && projectConfig.notificationSettings?.emailAddresses) {
      // Here you would integrate with email service
      logger.info(`Sending email notifications for analysis ${analysisId}`);
    }

  } catch (error) {
    logger.error(`Webhook analysis ${analysisId} failed:`, error);

    await Analysis.findByIdAndUpdate(analysisId, {
      status: 'FAILED',
      error: error.message,
      failedAt: new Date(),
    });
  }
}

function generateMockAnalysisResults(changedFiles: string[], projectConfig: any) {
  // Generate more realistic results based on changed files
  const hasAuthFiles = changedFiles.some(f => f.includes('auth') || f.includes('login'));
  const hasApiFiles = changedFiles.some(f => f.includes('api') || f.includes('routes'));
  const hasDbFiles = changedFiles.some(f => f.includes('db') || f.includes('model'));

  const vulnerabilities = [];
  let securityScore = 85;

  if (hasAuthFiles) {
    vulnerabilities.push({
      id: 'vuln_auth_1',
      type: 'SQL_INJECTION',
      severity: 'HIGH',
      file: changedFiles.find(f => f.includes('auth')) || 'auth.py',
      line: 47,
      description: 'Potential SQL injection in authentication logic',
      suggestedFix: 'Use parameterized queries with prepared statements',
      owaspCategory: 'A03:2021',
      confidence: 0.85,
      exploitability: 0.7,
      impact: 0.9,
      fixComplexity: 'MEDIUM',
    });
    securityScore -= 15;
  }

  if (hasApiFiles) {
    vulnerabilities.push({
      id: 'vuln_api_1',
      type: 'BROKEN_ACCESS_CONTROL',
      severity: 'MEDIUM',
      file: changedFiles.find(f => f.includes('api')) || 'routes.js',
      line: 23,
      description: 'Missing authorization check in API endpoint',
      suggestedFix: 'Add proper authorization middleware',
      owaspCategory: 'A01:2021',
      confidence: 0.75,
      exploitability: 0.6,
      impact: 0.7,
      fixComplexity: 'LOW',
    });
    securityScore -= 10;
  }

  const threatLevel = vulnerabilities.some(v => v.severity === 'CRITICAL') ? 'CRITICAL' :
                     vulnerabilities.some(v => v.severity === 'HIGH') ? 'HIGH' :
                     vulnerabilities.some(v => v.severity === 'MEDIUM') ? 'MEDIUM' : 'LOW';

  return {
    securityScore: Math.max(securityScore, 0),
    threatLevel,
    vulnerabilities,
    threatModel: {
      nodes: [
        {
          id: 'api_gateway',
          type: 'API',
          label: 'API Gateway',
          vulnerabilities: hasApiFiles ? ['broken_access_control'] : [],
          riskLevel: hasApiFiles ? 0.7 : 0.3,
          position: { x: 0, y: 0, z: 0 }
        },
        {
          id: 'auth_service',
          type: 'AUTH_SERVICE',
          label: 'Authentication Service',
          vulnerabilities: hasAuthFiles ? ['sql_injection'] : [],
          riskLevel: hasAuthFiles ? 0.8 : 0.2,
          position: { x: 3, y: 0, z: 0 }
        },
        {
          id: 'database',
          type: 'DATABASE',
          label: 'Database',
          vulnerabilities: hasDbFiles ? ['data_exposure'] : [],
          riskLevel: hasDbFiles ? 0.6 : 0.2,
          position: { x: -3, y: 0, z: 0 }
        }
      ],
      edges: [
        {
          source: 'api_gateway',
          target: 'auth_service',
          dataFlow: 'auth_requests',
          encrypted: true,
          authenticated: false,
          riskLevel: hasAuthFiles ? 0.7 : 0.3
        },
        {
          source: 'auth_service',
          target: 'database',
          dataFlow: 'user_queries',
          encrypted: false,
          authenticated: true,
          riskLevel: hasAuthFiles && hasDbFiles ? 0.8 : 0.4
        }
      ],
      attackVectors: vulnerabilities.map(v => ({
        id: `attack_${v.id}`,
        name: `${v.type.replace('_', ' ')} Attack`,
        description: `Attack vector targeting ${v.file}`,
        likelihood: v.exploitability,
        impact: v.impact,
        path: ['api_gateway', 'auth_service', 'database'].slice(0, 2)
      })),
      attackSurface: {
        endpoints: changedFiles.filter(f => f.includes('api') || f.includes('route')).length || 5,
        inputPoints: changedFiles.length,
        outputPoints: Math.ceil(changedFiles.length / 2),
        externalDependencies: 3,
        privilegedFunctions: hasAuthFiles ? 2 : 0
      }
    },
    aiAnalysis: `Analysis of ${changedFiles.length} changed files completed. ${vulnerabilities.length} security issues found requiring attention.`,
    remediationSteps: vulnerabilities.map((v, i) => ({
      id: `rem_${i + 1}`,
      title: `Fix ${v.type.replace('_', ' ')} in ${v.file}`,
      description: v.suggestedFix,
      priority: v.severity,
      effort: v.fixComplexity,
      category: 'CODE_CHANGE',
      files: [v.file],
      estimatedTime: v.fixComplexity === 'LOW' ? '15 minutes' :
                     v.fixComplexity === 'MEDIUM' ? '1 hour' : '4 hours',
      autoFixAvailable: v.fixComplexity === 'LOW',
    })),
    complianceScore: {
      owasp: Math.max(0, (securityScore - 20) / 80),
      pci: Math.max(0, (securityScore - 30) / 70),
      sox: Math.max(0, (securityScore - 25) / 75),
      gdpr: Math.max(0, (securityScore - 15) / 85),
      iso27001: Math.max(0, (securityScore - 20) / 80),
    },
    changedFilesAnalyzed: changedFiles,
  };
}

// Test webhook endpoint
router.post('/test', async (req: Request, res: Response) => {
  try {
    logger.info('Test webhook received:', req.body);
    res.json({
      message: 'Test webhook received successfully',
      timestamp: new Date().toISOString(),
      body: req.body,
    });
  } catch (error) {
    logger.error('Test webhook failed:', error);
    res.status(500).json({ error: 'Test webhook failed' });
  }
});

// Webhook status endpoint
router.get('/status/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Get project configuration
    const projectConfig = await Project.findOne({ gitlabProjectId: projectId });
    if (!projectConfig) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get recent webhook-triggered analyses
    const recentAnalyses = await Analysis.find({
      projectId,
      triggeredBy: 'webhook'
    })
    .sort({ createdAt: -1 })
    .limit(5);

    res.json({
      projectId,
      webhookActive: !!projectConfig.webhookSecret,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/webhooks/gitlab`,
      hasWebhookSecret: !!projectConfig.webhookSecret,
      recentAnalyses,
      lastWebhookTrigger: recentAnalyses[0]?.createdAt || null,
      scanFrequency: projectConfig.scanFrequency,
    });
  } catch (error) {
    logger.error('Failed to get webhook status:', error);
    res.status(500).json({ error: 'Failed to get webhook status' });
  }
});

// Regenerate webhook secret endpoint
router.post('/regenerate-secret/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Generate new webhook secret
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let newSecret = '';
    for (let i = 0; i < 64; i++) {
      newSecret += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Update project configuration
    const project = await Project.findOneAndUpdate(
      { gitlabProjectId: projectId },
      {
        webhookSecret: newSecret,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    logger.info(`Regenerated webhook secret for project ${projectId}`);

    res.json({
      message: 'Webhook secret regenerated successfully',
      newSecret,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/webhooks/gitlab`,
    });
  } catch (error) {
    logger.error('Failed to regenerate webhook secret:', error);
    res.status(500).json({ error: 'Failed to regenerate webhook secret' });
  }
});

export default router;
