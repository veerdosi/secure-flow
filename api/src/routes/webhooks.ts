import { Router, Request, Response } from 'express';
import { Project, Analysis } from '../models';
import gitlabService from '../services/gitlab';
import logger from '../utils/logger';

const router = Router();

// GitLab webhook endpoint
router.post('/gitlab', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-gitlab-token'] as string;
    const eventType = req.headers['x-gitlab-event'] as string;
    
    if (!signature || !eventType) {
      return res.status(400).json({ error: 'Missing required headers' });
    }

    const payload = JSON.stringify(req.body);
    
    // Extract project ID from payload
    let gitlabProjectId: string;
    if (req.body.project?.id) {
      gitlabProjectId = req.body.project.id.toString();
    } else if (req.body.project_id) {
      gitlabProjectId = req.body.project_id.toString();
    } else {
      return res.status(400).json({ error: 'Project ID not found in payload' });
    }

    // Find project in our database
    const project = await Project.findOne({ gitlabProjectId });
    if (!project) {
      logger.warn(`Webhook received for unknown project: ${gitlabProjectId}`);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Validate webhook signature
    const isValidSignature = await gitlabService.validateWebhookSignature(
      payload,
      signature,
      project.webhookSecret
    );

    if (!isValidSignature) {
      logger.error(`Invalid webhook signature for project: ${project._id}`);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process webhook based on event type
    if (eventType === 'Push Hook' || eventType === 'Merge Request Hook') {
      await processWebhookAnalysis(project, eventType, req.body);
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    logger.error('Webhook processing failed:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Process webhook and trigger analysis
async function processWebhookAnalysis(project: any, eventType: string, payload: any) {
  try {
    let commitHash = '';
    let commitMessage = '';
    let author = null;
    let changedFiles: string[] = [];
    let branch = project.branch;

    // Extract commit information based on event type
    if (eventType === 'Push Hook') {
      if (payload.commits && payload.commits.length > 0) {
        const latestCommit = payload.commits[payload.commits.length - 1];
        commitHash = latestCommit.id;
        commitMessage = latestCommit.message;
        author = {
          name: latestCommit.author?.name,
          email: latestCommit.author?.email
        };
        branch = payload.ref?.replace('refs/heads/', '') || project.branch;
        
        // Collect changed files
        changedFiles = [
          ...(latestCommit.added || []),
          ...(latestCommit.modified || []),
          ...(latestCommit.removed || [])
        ];
      }
    } else if (eventType === 'Merge Request Hook') {
      const mr = payload.object_attributes;
      if (mr && mr.state === 'merged') {
        commitHash = mr.merge_commit_sha || mr.last_commit?.id;
        commitMessage = `Merge request: ${mr.title}`;
        author = {
          name: payload.user?.name,
          email: payload.user?.email
        };
        branch = mr.target_branch;
      }
    }

    if (!commitHash) {
      logger.warn(`No commit hash found in webhook payload for project: ${project._id}`);
      return;
    }

    // Check if analysis already exists for this commit
    const existingAnalysis = await Analysis.findOne({
      projectId: project._id.toString(),
      commitHash
    });

    if (existingAnalysis) {
      logger.info(`Analysis already exists for commit ${commitHash}, skipping`);
      return;
    }

    // Create new analysis record
    const analysis = new Analysis({
      projectId: project._id.toString(),
      commitHash,
      securityScore: 0,
      threatLevel: 'LOW',
      vulnerabilities: [],
      threatModel: {},
      aiAnalysis: '',
      remediationSteps: [],
      complianceScore: {},
      status: 'PENDING',
      stage: 'INITIALIZING',
      progress: 0,
      triggeredBy: 'webhook',
      userId: project.createdBy,
      changedFiles,
      commitMessage,
      author,
    });

    await analysis.save();

    logger.info(`Webhook analysis created: ${analysis._id} for project ${project._id}, commit ${commitHash}`);

    // Start background analysis processing
    processAnalysisInBackground(analysis._id.toString(), project._id.toString(), commitHash)
      .catch(error => {
        logger.error('Background analysis failed:', error);
      });

    // Update project's last scan date
    project.lastScanDate = new Date();
    await project.save();

  } catch (error) {
    logger.error('Failed to process webhook analysis:', error);
    throw error;
  }
}

// Background analysis processing (same as in analysis routes but extracted)
async function processAnalysisInBackground(analysisId: string, projectId: string, commitHash: string) {
  try {
    // Import analysis service here to avoid circular dependencies
    const aiAnalysisService = (await import('../services/aiAnalysis')).default;
    
    // Get analysis to get userId
    const analysis = await Analysis.findById(analysisId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    const userId = analysis.userId;
    if (!userId) {
      throw new Error('User ID not found in analysis data');
    }

    // Update status to IN_PROGRESS
    await Analysis.findByIdAndUpdate(analysisId, {
      status: 'IN_PROGRESS',
      stage: 'FETCHING_CODE',
      progress: 10,
      startedAt: new Date(),
    });

    // Get project files
    const files = await gitlabService.getProjectFiles(projectId, userId, commitHash);
    logger.info(`Found ${files.length} code files for analysis`);

    await Analysis.findByIdAndUpdate(analysisId, {
      stage: 'STATIC_ANALYSIS',
      progress: 30,
    });

    // Analyze files
    const allVulnerabilities = [];
    let totalScore = 0;
    let fileCount = 0;

    // Process files in batches to avoid overwhelming the AI service
    const batchSize = 5;
    for (let i = 0; i < Math.min(files.length, 20); i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      for (const file of batch) {
        try {
          const content = await gitlabService.getFileContent(projectId, userId, file.path, commitHash);
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

          // Update progress
          const progress = Math.min(30 + (i / Math.min(files.length, 20)) * 30, 60);
          await Analysis.findByIdAndUpdate(analysisId, { progress });
          
        } catch (error) {
          logger.warn(`Failed to analyze file ${file.path}:`, error);
        }
      }
      
      // Small delay between batches to prevent rate limiting
      if (i + batchSize < Math.min(files.length, 20)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    await Analysis.findByIdAndUpdate(analysisId, {
      stage: 'AI_ANALYSIS',
      progress: 70,
    });

    // Generate threat model
    const threatModel = await aiAnalysisService.generateThreatModel(
      files.slice(0, 10).map(f => f.path),
      { projectId, fileCount: files.length, commitHash }
    );

    await Analysis.findByIdAndUpdate(analysisId, {
      stage: 'THREAT_MODELING',
      progress: 85,
    });

    // Calculate final scores
    const avgScore = fileCount > 0 ? Math.round(totalScore / fileCount) : 50;
    const threatLevel = allVulnerabilities.some(v => v.severity === 'CRITICAL') ? 'CRITICAL' :
                       allVulnerabilities.some(v => v.severity === 'HIGH') ? 'HIGH' :
                       allVulnerabilities.some(v => v.severity === 'MEDIUM') ? 'MEDIUM' : 'LOW';

    // Generate remediation steps
    const remediationSteps = allVulnerabilities.length > 0 
      ? await aiAnalysisService.generateRemediationSteps(allVulnerabilities.slice(0, 10))
      : [];

    await Analysis.findByIdAndUpdate(analysisId, {
      stage: 'GENERATING_REPORT',
      progress: 95,
    });

    // Generate AI analysis summary
    const aiAnalysisSummary = `Webhook-triggered analysis completed for commit ${commitHash.substring(0, 8)}. 
    Analyzed ${fileCount} files and found ${allVulnerabilities.length} potential security issues. 
    Security score: ${avgScore}/100. Threat level: ${threatLevel}.`;

    // Final update
    await Analysis.findByIdAndUpdate(analysisId, {
      status: 'COMPLETED',
      stage: 'COMPLETED',
      progress: 100,
      securityScore: avgScore,
      threatLevel,
      vulnerabilities: allVulnerabilities,
      threatModel,
      remediationSteps,
      aiAnalysis: aiAnalysisSummary,
      complianceScore: {
        owasp: Math.max(0, (avgScore - 20) / 80),
        pci: Math.max(0, (avgScore - 30) / 70),
        sox: Math.max(0, (avgScore - 25) / 75),
        gdpr: Math.max(0, (avgScore - 15) / 85),
        iso27001: Math.max(0, (avgScore - 20) / 80),
      },
      completedAt: new Date(),
    });

    logger.info(`Webhook analysis ${analysisId} completed successfully. Score: ${avgScore}, Vulnerabilities: ${allVulnerabilities.length}`);

    // Send notifications if configured
    await sendNotifications(projectId, analysis, avgScore, allVulnerabilities.length);

  } catch (error) {
    logger.error(`Webhook analysis ${analysisId} failed:`, error);

    await Analysis.findByIdAndUpdate(analysisId, {
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      failedAt: new Date(),
    });
  }
}

// Send notifications based on project settings
async function sendNotifications(projectId: string, analysis: any, securityScore: number, vulnerabilityCount: number) {
  try {
    const project = await Project.findById(projectId);
    if (!project?.notificationSettings) return;

    // Import notification service to avoid circular dependencies
    const notificationService = (await import('../services/notification')).default;

    // Count vulnerabilities by severity
    const vulnerabilities = analysis.vulnerabilities || [];
    const criticalCount = vulnerabilities.filter((v: any) => v.severity === 'CRITICAL').length;
    const highCount = vulnerabilities.filter((v: any) => v.severity === 'HIGH').length;
    const mediumCount = vulnerabilities.filter((v: any) => v.severity === 'MEDIUM').length;
    const lowCount = vulnerabilities.filter((v: any) => v.severity === 'LOW').length;

    const notificationData = {
      projectId: project._id.toString(),
      projectName: project.name,
      analysisId: analysis._id.toString(),
      commitHash: analysis.commitHash,
      commitMessage: analysis.commitMessage,
      author: analysis.author,
      securityScore,
      threatLevel: analysis.threatLevel,
      vulnerabilityCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      repositoryUrl: project.repositoryUrl,
      dashboardUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard?project=${projectId}`,
    };

    await notificationService.sendAnalysisNotifications(notificationData);

  } catch (error) {
    logger.error('Failed to send notifications:', error);
  }
}

// Test webhook endpoint for debugging
router.post('/test/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Create a test webhook payload
    const testPayload = {
      object_kind: 'push',
      ref: `refs/heads/${project.branch}`,
      project: {
        id: parseInt(project.gitlabProjectId),
        name: project.name,
        web_url: project.repositoryUrl
      },
      commits: [{
        id: `test_commit_${Date.now()}`,
        message: 'Test webhook trigger',
        author: {
          name: 'Test User',
          email: 'test@example.com'
        },
        added: ['test.js'],
        modified: [],
        removed: []
      }]
    };

    await processWebhookAnalysis(project, 'Push Hook', testPayload);

    res.json({ 
      message: 'Test webhook processed successfully',
      projectId: project._id
    });
  } catch (error) {
    logger.error('Test webhook failed:', error);
    res.status(500).json({ error: 'Test webhook failed' });
  }
});

// Get webhook history for a project
router.get('/history/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const analyses = await Analysis.find({ 
      projectId,
      triggeredBy: 'webhook'
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('commitHash commitMessage author status threatLevel securityScore createdAt completedAt');

    res.json(analyses);
  } catch (error) {
    logger.error('Failed to get webhook history:', error);
    res.status(500).json({ error: 'Failed to retrieve webhook history' });
  }
});

export default router;