import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Analysis } from '../models';
import gitlabService from '../services/gitlab';
import aiAnalysisService from '../services/aiAnalysis';
import remediationService from '../services/remediationService';
import AnalysisScheduler from '../services/analysisScheduler';
import logger from '../utils/logger';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

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
      
      // Get user ID from JWT token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;

      // Create analysis record
      const analysis = new Analysis({
        projectId,
        commitHash: commitHash || 'latest',
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
        triggeredBy: 'manual',
        userId: decoded.userId,
      });

      await analysis.save();

      // Start background analysis
      processAnalysis(analysis._id.toString(), projectId, commitHash).catch(error => {
        logger.error('Background analysis failed:', error);
      });

      res.status(202).json({
        message: 'Analysis started',
        analysisId: analysis._id,
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
  authMiddleware,
  param('analysisId').notEmpty(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { analysisId } = req.params;

      const analysis = await Analysis.findById(analysisId);

      if (!analysis) {
        return res.status(404).json({ error: 'Analysis not found' });
      }

      res.json(analysis);
    } catch (error) {
      logger.error('Failed to get analysis:', error);
      res.status(500).json({ error: 'Failed to retrieve analysis' });
    }
  }
);

// Get project analyses
router.get('/project/:projectId',
  authMiddleware,
  param('projectId').notEmpty(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const analyses = await Analysis.find({ projectId })
        .sort({ createdAt: -1 })
        .limit(limit);

      res.json(analyses);
    } catch (error) {
      logger.error('Failed to get project analyses:', error);
      res.status(500).json({ error: 'Failed to retrieve project analyses' });
    }
  }
);

// Get analysis history/trends for a project
router.get('/project/:projectId/history',
  authMiddleware,
  param('projectId').notEmpty(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const analyses = await Analysis.find({
        projectId,
        status: 'COMPLETED',
        completedAt: { $gte: startDate }
      })
      .select('securityScore threatLevel vulnerabilities history completedAt triggeredBy')
      .sort({ completedAt: 1 });

      // Flatten history entries
      const historyData = analyses.flatMap(analysis => 
        analysis.history.map(entry => ({
          ...entry,
          analysisId: analysis._id
        }))
      );

      res.json({
        analyses: analyses.length,
        timeRange: `${days} days`,
        history: historyData,
        summary: {
          averageScore: analyses.reduce((sum, a) => sum + a.securityScore, 0) / analyses.length || 0,
          totalVulnerabilities: analyses.reduce((sum, a) => sum + a.vulnerabilities.length, 0),
          criticalFindings: analyses.filter(a => a.threatLevel === 'CRITICAL').length
        }
      });
    } catch (error) {
      logger.error('Failed to get analysis history:', error);
      res.status(500).json({ error: 'Failed to retrieve analysis history' });
    }
  }
);

// Manual trigger for scheduled analyses (admin/testing)
router.post('/trigger-scheduled',
  [
    body('frequency').isIn(['DAILY', 'WEEKLY']).withMessage('Frequency must be DAILY or WEEKLY'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { frequency } = req.body;
      
      // Check if user has admin role
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
      
      if (decoded.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const scheduler = AnalysisScheduler.getInstance();
      await scheduler.triggerManualScheduledRun(frequency);

      res.json({
        message: `${frequency} scheduled analyses triggered successfully`,
        frequency,
        triggeredAt: new Date()
      });
    } catch (error) {
      logger.error('Failed to trigger scheduled analyses:', error);
      res.status(500).json({ error: 'Failed to trigger scheduled analyses' });
    }
  }
);

// Background analysis processing
async function processAnalysis(analysisId: string, projectId: string, commitHash?: string) {
  logger.info(`🚀 Starting analysis process`, {
    analysisId,
    projectId,
    commitHash: commitHash || 'main'
  });

  try {
    // Get analysis document first to get userId
    const analysis = await Analysis.findById(analysisId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    const userId = analysis.userId;
    if (!userId) {
      throw new Error('User ID not found in analysis data');
    }

    // Get the actual project document to get gitlabProjectId
    const { Project } = require('../models');
    const projectDoc = await Project.findById(projectId);
    if (!projectDoc) {
      throw new Error('Project not found');
    }

    const actualGitlabProjectId = projectDoc.gitlabProjectId;

    // Get previous analysis for comparison
    const previousAnalysis = await Analysis.findOne({
      projectId,
      status: 'COMPLETED',
      _id: { $ne: analysisId }
    }).sort({ completedAt: -1 });

    // Update status to IN_PROGRESS
    await Analysis.findByIdAndUpdate(analysisId, {
      status: 'IN_PROGRESS',
      stage: 'FETCHING_CODE',
      progress: 10,
      startedAt: new Date(),
      previousAnalysisId: previousAnalysis?._id
    });

    // Get project files using the actual GitLab project ID
    logger.info(`📁 Fetching project files from GitLab`, {
      analysisId,
      mongoProjectId: projectId,
      gitlabProjectId: actualGitlabProjectId,
      commitHash: commitHash || 'main',
      userId
    });

    const files = await gitlabService.getProjectFiles(actualGitlabProjectId, userId, commitHash || 'main');
    
    logger.info(`📁 Retrieved ${files.length} files from GitLab`, {
      analysisId,
      projectId,
      fileTypes: files.reduce((acc: any, f) => {
        const ext = f.path.split('.').pop() || 'unknown';
        acc[ext] = (acc[ext] || 0) + 1;
        return acc;
      }, {})
    });

    await Analysis.findByIdAndUpdate(analysisId, {
      stage: 'STATIC_ANALYSIS',
      progress: 30,
    });

    // Analyze files
    const allVulnerabilities = [];
    let totalScore = 0;
    let fileCount = 0;
    let analysisErrors = 0;

    logger.info(`🔍 Starting file analysis loop`, {
      analysisId,
      totalFiles: files.length,
      analyzing: Math.min(files.length, 10)
    });

    for (const [index, file] of files.slice(0, 10).entries()) {
      logger.info(`📄 Analyzing file ${index + 1}/${Math.min(files.length, 10)}: ${file.path}`, {
        analysisId,
        fileName: file.path,
        fileSize: file.size || 'unknown'
      });

      try {
        const startTime = Date.now();
        const content = await gitlabService.getFileContent(actualGitlabProjectId, userId, file.path, commitHash || 'main');
        
        logger.info(`📥 Retrieved file content for ${file.path}`, {
          analysisId,
          contentLength: content.length,
          retrievalTime: Date.now() - startTime
        });

        const aiStartTime = Date.now();
        const aiResult = await aiAnalysisService.analyzeCode(content, file.path);
        
        logger.info(`🤖 AI analysis completed for ${file.path}`, {
          analysisId,
          aiProcessingTime: Date.now() - aiStartTime,
          vulnerabilities: aiResult.vulnerabilities?.length || 0,
          securityScore: aiResult.securityScore,
          threatLevel: aiResult.threatLevel || 'unknown'
        });

        if (aiResult.vulnerabilities) {
          const vulnerabilities = aiResult.vulnerabilities.map((v: any) => ({
            ...v,
            file: file.path,
            id: `vuln_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          }));
          
          allVulnerabilities.push(...vulnerabilities);
          
          logger.info(`📝 Added vulnerabilities from ${file.path}`, {
            analysisId,
            newVulns: vulnerabilities.length,
            totalVulns: allVulnerabilities.length,
            severities: vulnerabilities.reduce((acc: any, v) => {
              acc[v.severity] = (acc[v.severity] || 0) + 1;
              return acc;
            }, {})
          });
        }

        totalScore += aiResult.securityScore || 50;
        fileCount++;
      } catch (error) {
        analysisErrors++;
        logger.error(`❌ Failed to analyze file ${file.path}`, {
          analysisId,
          fileName: file.path,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }

    logger.info(`📊 File analysis complete`, {
      analysisId,
      filesAnalyzed: fileCount,
      analysisErrors,
      totalVulnerabilities: allVulnerabilities.length,
      averageScore: fileCount > 0 ? Math.round(totalScore / fileCount) : 50
    });

    await Analysis.findByIdAndUpdate(analysisId, {
      stage: 'AI_ANALYSIS',
      progress: 60,
    });

    // Generate threat model
    logger.info(`🧠 Generating threat model`, {
      analysisId,
      filesCount: files.length
    });

    const threatModel = await aiAnalysisService.generateThreatModel(
      files.map(f => f.path),
      { projectId, fileCount: files.length }
    );

    logger.info(`✅ Threat model generated`, {
      analysisId,
      components: threatModel.components?.length || 0,
      threats: threatModel.threats?.length || 0
    });

    await Analysis.findByIdAndUpdate(analysisId, {
      stage: 'THREAT_MODELING',
      progress: 80,
    });

    // Calculate final scores
    const avgScore = fileCount > 0 ? Math.round(totalScore / fileCount) : 50;
    const threatLevel = allVulnerabilities.some(v => v.severity === 'CRITICAL') ? 'CRITICAL' :
                       allVulnerabilities.some(v => v.severity === 'HIGH') ? 'HIGH' :
                       allVulnerabilities.some(v => v.severity === 'MEDIUM') ? 'MEDIUM' : 'LOW';

    logger.info(`📈 Final scores calculated`, {
      analysisId,
      avgScore,
      threatLevel,
      totalVulns: allVulnerabilities.length
    });

    // Generate remediation steps
    logger.info(`🔧 Generating remediation steps`, {
      analysisId,
      vulnerabilityCount: allVulnerabilities.length
    });

    const remediationSteps = await aiAnalysisService.generateRemediationSteps(allVulnerabilities);

    // Generate automated remediation actions
    const remediationActions = await remediationService.generateRemediationActions(allVulnerabilities, files);

    logger.info(`🛠️ Remediation generated`, {
      analysisId,
      remediationSteps: remediationSteps.length,
      automatedActions: remediationActions.length
    });

    // Calculate vulnerability changes
    let newVulnerabilities = 0;
    let resolvedVulnerabilities = 0;
    
    if (previousAnalysis) {
      const prevVulnIds = new Set(previousAnalysis.vulnerabilities.map((v: any) => v.id));
      const currentVulnIds = new Set(allVulnerabilities.map(v => v.id));
      
      newVulnerabilities = allVulnerabilities.filter(v => !prevVulnIds.has(v.id)).length;
      resolvedVulnerabilities = previousAnalysis.vulnerabilities.filter((v: any) => !currentVulnIds.has(v.id)).length;
    }

    // Create history entry
    const historyEntry = {
      timestamp: new Date(),
      securityScore: avgScore,
      threatLevel: threatLevel as any,
      vulnerabilityCount: allVulnerabilities.length,
      newVulnerabilities,
      resolvedVulnerabilities,
      commitHash: commitHash || 'latest',
      triggeredBy: analysis.triggeredBy as any
    };

    // Determine if human approval is needed
    const needsApproval = remediationActions.length > 0 && (
      remediationActions.some(a => a.severity === 'CRITICAL' || a.severity === 'HIGH') ||
      remediationActions.some(a => a.estimatedRisk === 'HIGH') ||
      remediationActions.some(a => a.confidence < 70)
    );

    const finalStatus = needsApproval ? 'AWAITING_APPROVAL' : 'COMPLETED';

    logger.info(`💾 Saving final analysis results`, {
      analysisId,
      status: finalStatus,
      needsApproval,
      avgScore,
      threatLevel,
      vulnerabilityCount: allVulnerabilities.length,
      remediationActions: remediationActions.length
    });

    // Final update
    await Analysis.findByIdAndUpdate(analysisId, {
      status: finalStatus,
      stage: needsApproval ? 'AWAITING_APPROVAL' : 'COMPLETED',
      progress: 100,
      securityScore: avgScore,
      threatLevel,
      vulnerabilities: allVulnerabilities,
      threatModel,
      remediationSteps,
      proposedRemediations: remediationActions,
      humanApproval: {
        status: 'PENDING',
        approvedActions: [],
        rejectedActions: [],
        comments: '',
        requestedChanges: []
      },
      autoRemediationEnabled: false, // Default to requiring approval
      aiAnalysis: `Analysis completed. Found ${allVulnerabilities.length} vulnerabilities across ${fileCount} files. ${needsApproval ? 'Human approval required for remediation.' : ''}`,
      complianceScore: {
        owasp: Math.max(0, (avgScore - 20) / 80),
        pci: Math.max(0, (avgScore - 30) / 70),
        sox: Math.max(0, (avgScore - 25) / 75),
        gdpr: Math.max(0, (avgScore - 15) / 85),
        iso27001: Math.max(0, (avgScore - 20) / 80),
      },
      history: [historyEntry],
      completedAt: needsApproval ? undefined : new Date(),
    });

    if (needsApproval) {
      logger.info(`✅ Analysis ${analysisId} completed - awaiting human approval for ${remediationActions.length} remediation actions`);
    } else {
      logger.info(`✅ Analysis ${analysisId} completed successfully with no remediations needed`);
    }
  } catch (error) {
    logger.error(`💥 Analysis ${analysisId} failed:`, {
      analysisId,
      projectId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    await Analysis.findByIdAndUpdate(analysisId, {
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      failedAt: new Date(),
    });
  }
}

export { processAnalysis };

export default router;
