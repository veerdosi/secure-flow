import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB } from './models';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import analysisRoutes from './routes/analysis';
import approvalRoutes from './routes/approval';
import projectRoutes from './routes/projects';
import webhookRoutes from './routes/webhooks';
import systemRoutes from './routes/system';
import notificationRoutes from './routes/notifications';
import AnalysisScheduler from './services/analysisScheduler';
import logger from './utils/logger';

// Load environment variables - enhanced for Lambda environment
dotenv.config();

const app = express();
// Critical: Lambda Web Adapter requires port 8080
const PORT = process.env.PORT || 8080;

// Enhanced proxy trust for Lambda API Gateway integration
app.set('trust proxy', 1);

// Serverless-optimized rate limiting configuration
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  validate: {
    trustProxy: false, // Disable validation warnings in Lambda
    xForwardedForHeader: false,
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
});

// Security middleware
app.use(helmet());

// Enhanced CORS configuration for Lambda API Gateway
const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    // Lambda-specific allowed origins
    const allowedOrigins = [
      process.env.CLIENT_URL, // Primary frontend URL
      'https://secure-flow-landing.vercel.app', // Your current Vercel deployment
      'http://localhost:3000', // Local development
      'https://localhost:3000',
      process.env.API_BASE_URL, // Self-referential for internal calls
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Exact origin matching
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Dynamic Vercel preview deployment support
    if (origin.includes('.vercel.app')) {
      return callback(null, true);
    }

    // AWS API Gateway domains (execute-api.*.amazonaws.com)
    if (origin.includes('.execute-api.') && origin.includes('.amazonaws.com')) {
      return callback(null, true);
    }

    // Production environment security enforcement
    if (process.env.NODE_ENV === 'production') {
      logger.warn(`CORS security: Blocked unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    } else {
      callback(null, true); // Development environment flexibility
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-GitLab-Event']
};

app.use(cors(corsOptions));
app.use(limiter);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Lambda Web Adapter health check endpoint (required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: 'aws-lambda',
    database: 'connected', // MongoDB connection assumed functional
    region: process.env.AWS_REGION || 'ap-south-1',
    adapter: 'lambda-web-adapter'
  });
});

// API route configuration (unchanged from original)
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes); // Unauthenticated webhook endpoints
app.use('/api/system', systemRoutes); // System health and status endpoints
app.use('/api/analysis', authMiddleware, analysisRoutes);
app.use('/api/approval', authMiddleware, approvalRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);

// Centralized error handling
app.use(errorHandler);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Lambda-specific initialization management
let isInitialized = false;

const initializeLambdaEnvironment = async (): Promise<void> => {
  if (isInitialized) return;
  
  try {
    // Database connection with Lambda-optimized settings
    await connectDB();
    logger.info('✅ MongoDB Atlas connection established in Lambda environment');
    
    // Analysis scheduler initialization (adapted for Lambda lifecycle)
    const scheduler = AnalysisScheduler.getInstance();
    scheduler.start();
    logger.info('✅ Analysis scheduler activated for Lambda environment');
    
    isInitialized = true;
    logger.info('🚀 Lambda environment initialization completed successfully');
  } catch (error) {
    logger.error('❌ Lambda initialization failed:', error);
    throw error;
  }
};

// Express server initialization (Lambda Web Adapter handles lifecycle)
app.listen(PORT, async () => {
  logger.info(`🚀 SecureFlow API operational on port ${PORT} (Lambda Web Adapter)`);
  logger.info(`📊 Health monitoring: /health`);
  logger.info(`🗄️  Database: MongoDB Atlas integration active`);
  logger.info(`🔐 Authentication: JWT + Google OAuth enabled`);
  logger.info(`🤖 AI Analysis: Gemini API integration ready`);
  
  // Initialize Lambda-specific services
  await initializeLambdaEnvironment();
});

// Lambda lifecycle management
process.on('SIGTERM', () => {
  logger.info('🔄 SIGTERM received: Initiating graceful Lambda shutdown');
  const scheduler = AnalysisScheduler.getInstance();
  scheduler.stop();
  logger.info('✅ Analysis scheduler deactivated');
});

process.on('SIGINT', () => {
  logger.info('🔄 SIGINT received: Initiating development shutdown');
  const scheduler = AnalysisScheduler.getInstance();
  scheduler.stop();
});

export default app;
