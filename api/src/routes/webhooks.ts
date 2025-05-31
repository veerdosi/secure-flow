import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../services/firebase';
import gitlabService from '../services/gitlab';
import logger from '../utils/logger';

const router = Router();

// GitLab webhook handler
router.post('/gitlab', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-gitlab-token'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    if (!gitlabService.validateWebhookSignature(payload, signature)) {
      logger.warn('Invalid GitLab webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
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

    // Check if project has SecureFlow enabled
    const db = getDb();
    const projectDoc = await db.collection('projects').doc(project.id.toString()).get();

    if (!projectDoc.exists) {
      logger.info(`Project ${project.id} not configured for SecureFlow`);
      return res.status(200).json({ message: 'Project not configured' });
    }

    const projectConfig = projectDoc.data();

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

    // Trigger analysis
    const analysisId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const analysis = {
      id: analysisId,
      projectId: project.id.toString(),
      commitHash: latestCommit.id,
      timestamp: new Date().toISOString(),
      status: 'PENDING',
      securityScore: 0,
      threatLevel: 'UNKNOWN',
      vulnerabilities: [],
      scanTypes: ['STATIC_ANALYSIS', 'DEPENDENCY_SCAN'],
      triggeredBy: 'webhook',
      changedFiles,
      commitMessage: latestCommit.message,
      author: latestCommit.author,
      createdAt: new Date().toISOString(),
    };

    await db.collection('analyses').doc(analysisId).set(analysis);

    logger.info(`Started analysis ${analysisId} for webhook trigger`);

    res.status(202).json({
      message: 'Analysis triggered',
      analysisId,
      changedFiles: changedFiles.length,
    });

  } catch (error) {
    logger.error('GitLab webhook processing failed:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

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
    const db = getDb();

    // Get recent webhook-triggered analyses
    const snapshot = await db
      .collection('analyses')
      .where('projectId', '==', projectId)
      .where('triggeredBy', '==', 'webhook')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();

    const recentAnalyses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      projectId,
      webhookActive: true,
      recentAnalyses,
      lastWebhookTrigger: recentAnalyses[0]?.timestamp || null,
    });
  } catch (error) {
    logger.error('Failed to get webhook status:', error);
    res.status(500).json({ error: 'Failed to get webhook status' });
  }
});

export default router;
