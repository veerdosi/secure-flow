import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import mongoose from 'mongoose';

// MongoDB connection
let isConnected = false;

const connectDB = async (): Promise<void> => {
  if (isConnected) {
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri, {
      maxPoolSize: 1, // Limit pool size for Lambda
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });
    
    isConnected = true;
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

// Analysis schema (simplified for webhook creation)
const analysisSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  projectId: { type: String, required: true },
  commitHash: { type: String, required: true },
  timestamp: { type: String, required: true },
  status: { type: String, required: true },
  triggeredBy: { type: String, required: true },
  commitMessage: String,
  author: Object,
  ref: String,
  securityScore: { type: Number, default: 0 },
  threatLevel: { type: String, default: 'UNKNOWN' },
  vulnerabilities: { type: Array, default: [] },
  createdAt: { type: String, required: true },
});

const Analysis = mongoose.models.Analysis || mongoose.model('Analysis', analysisSchema);

export const webhookHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-GitLab-Event',
    'Content-Type': 'application/json'
  };

  console.log('Webhook handler invoked:', {
    httpMethod: event.httpMethod,
    path: event.path,
    headers: event.headers
  });

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 204, 
      headers, 
      body: '' 
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    await connectDB();
    
    const body = JSON.parse(event.body || '{}');
    const { object_kind, project, commits, ref } = body;

    console.log('Webhook payload received:', {
      object_kind,
      projectId: project?.id,
      commitsCount: commits?.length,
      ref
    });

    // Validate webhook data
    if (object_kind !== 'push' || !project || !commits) {
      console.log('Invalid webhook data - not a push event or missing data');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid webhook data' })
      };
    }

    console.log(`Received webhook for project ${project.id}`);

    // Only process main branch pushes
    if (!ref.endsWith('/main') && !ref.endsWith('/master')) {
      console.log('Not main/master branch, ignoring');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Not main branch, ignoring' })
      };
    }

    // Create analysis record
    const latestCommit = commits[commits.length - 1];
    const analysisId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const analysisData = {
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

    const analysis = new Analysis(analysisData);
    await analysis.save();

    console.log(`Created analysis ${analysisId} for webhook`);

    // TODO: Trigger AI analysis (will be implemented when we migrate ai-analyzer)
    // For now, just log that analysis was created
    console.log('Analysis created successfully, AI processing will be triggered separately');

    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        message: 'Analysis triggered successfully',
        analysisId,
        projectId: project.id,
        commitHash: latestCommit.id,
        status: 'PENDING'
      })
    };

  } catch (error) {
    console.error('Webhook handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
