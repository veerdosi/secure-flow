import { http } from '@google-cloud/functions-framework';
import { Firestore } from '@google-cloud/firestore';
import { VertexAI } from '@google-cloud/vertexai';

const db = new Firestore();

export const webhookHandler = http('webhookHandler', async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { object_kind, project, commits, ref } = req.body;

    // Validate webhook data
    if (object_kind !== 'push' || !project || !commits) {
      res.status(400).json({ error: 'Invalid webhook data' });
      return;
    }

    console.log(`Received webhook for project ${project.id}`);

    // Only process main branch pushes
    if (!ref.endsWith('/main')) {
      res.status(200).json({ message: 'Not main branch, ignoring' });
      return;
    }

    // Check if project is configured for SecureFlow
    const projectDoc = await db.collection('projects').doc(project.id.toString()).get();

    if (!projectDoc.exists) {
      res.status(200).json({ message: 'Project not configured for SecureFlow' });
      return;
    }

    const projectConfig = projectDoc.data();

    if (projectConfig.scanFrequency !== 'ON_PUSH') {
      res.status(200).json({ message: 'Project not configured for push scanning' });
      return;
    }

    // Create analysis record
    const latestCommit = commits[commits.length - 1];
    const analysisId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const analysis = {
      id: analysisId,
      projectId: project.id.toString(),
      commitHash: latestCommit.id,
      timestamp: new Date().toISOString(),
      status: 'PENDING',
      triggeredBy: 'webhook',
      commitMessage: latestCommit.message,
      author: latestCommit.author,
      ref,
      securityScore: 0,
      threatLevel: 'UNKNOWN',
      vulnerabilities: [],
      createdAt: new Date().toISOString(),
    };

    await db.collection('analyses').doc(analysisId).set(analysis);

    // Trigger AI analysis (async)
    triggerAIAnalysis(analysisId, project.id.toString(), latestCommit.id)
      .catch(error => {
        console.error('AI analysis trigger failed:', error);
      });

    console.log(`Created analysis ${analysisId} for webhook`);

    res.status(202).json({
      message: 'Analysis triggered successfully',
      analysisId,
      projectId: project.id,
      commitHash: latestCommit.id,
    });

  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

async function triggerAIAnalysis(analysisId: string, projectId: string, commitHash: string) {
  try {
    // Update status to in progress
    await db.collection('analyses').doc(analysisId).update({
      status: 'IN_PROGRESS',
      stage: 'INITIALIZING',
      progress: 10,
      startedAt: new Date().toISOString(),
    });

    // In a real implementation, this would:
    // 1. Fetch code files from GitLab
    // 2. Run AI analysis on each file
    // 3. Generate threat model
    // 4. Calculate security scores
    // 5. Store results

    // For demo purposes, simulate analysis with mock data
    await simulateAnalysis(analysisId);

  } catch (error) {
    console.error(`Analysis ${analysisId} failed:`, error);

    await db.collection('analyses').doc(analysisId).update({
      status: 'FAILED',
      error: error.message,
      failedAt: new Date().toISOString(),
    });
  }
}

async function simulateAnalysis(analysisId: string) {
  // Simulate analysis stages
  const stages = [
    { stage: 'FETCHING_CODE', progress: 20, delay: 2000 },
    { stage: 'STATIC_ANALYSIS', progress: 40, delay: 3000 },
    { stage: 'AI_ANALYSIS', progress: 60, delay: 4000 },
    { stage: 'THREAT_MODELING', progress: 80, delay: 2000 },
    { stage: 'GENERATING_REPORT', progress: 95, delay: 1000 },
  ];

  for (const { stage, progress, delay } of stages) {
    await new Promise(resolve => setTimeout(resolve, delay));

    await db.collection('analyses').doc(analysisId).update({
      stage,
      progress,
      updatedAt: new Date().toISOString(),
    });
  }

  // Final results
  const mockResults = {
    status: 'COMPLETED',
    stage: 'COMPLETED',
    progress: 100,
    securityScore: 87,
    threatLevel: 'MEDIUM',
    vulnerabilities: [
      {
        id: 'vuln_1',
        type: 'SQL_INJECTION',
        severity: 'HIGH',
        file: 'src/auth/authentication.py',
        line: 47,
        description: 'SQL injection vulnerability in login function',
        suggestedFix: 'Use parameterized queries with prepared statements',
        owaspCategory: 'A03:2021',
        confidence: 0.95,
        exploitability: 0.8,
        impact: 0.9,
        fixComplexity: 'MEDIUM',
      }
    ],
    threatModel: {
      nodes: [
        {
          id: 'api_gateway',
          type: 'API',
          label: 'API Gateway',
          vulnerabilities: ['sql_injection'],
          riskLevel: 0.7,
          position: { x: 0, y: 0, z: 0 }
        },
        {
          id: 'database',
          type: 'DATABASE',
          label: 'Database',
          vulnerabilities: [],
          riskLevel: 0.5,
          position: { x: -3, y: 0, z: 0 }
        }
      ],
      edges: [
        {
          source: 'api_gateway',
          target: 'database',
          dataFlow: 'user_queries',
          encrypted: false,
          authenticated: true,
          riskLevel: 0.8
        }
      ],
      attackVectors: [
        {
          id: 'sql_injection_attack',
          name: 'SQL Injection Attack',
          description: 'Attacker can manipulate SQL queries through login form',
          likelihood: 0.8,
          impact: 0.9,
          path: ['api_gateway', 'database']
        }
      ],
      attackSurface: {
        endpoints: 12,
        inputPoints: 8,
        outputPoints: 4,
        externalDependencies: 6,
        privilegedFunctions: 3
      }
    },
    aiAnalysis: 'Critical SQL injection vulnerability detected in authentication module. Immediate remediation required.',
    remediationSteps: [
      {
        id: 'rem_1',
        title: 'Fix SQL Injection in Login Function',
        description: 'Replace string concatenation with parameterized queries',
        priority: 'CRITICAL',
        effort: 'MINOR',
        category: 'CODE_CHANGE',
        files: ['src/auth/authentication.py'],
        estimatedTime: '30 minutes',
        autoFixAvailable: true,
      }
    ],
    complianceScore: {
      owasp: 0.78,
      pci: 0.65,
      sox: 0.72,
      gdpr: 0.85,
      iso27001: 0.71,
    },
    completedAt: new Date().toISOString(),
  };

  await db.collection('analyses').doc(analysisId).update(mockResults);

  console.log(`Analysis ${analysisId} completed successfully`);
}
