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
import projectRoutes from './routes/projects';
import webhookRoutes from './routes/webhooks';
import systemRoutes from './routes/system';
import logger from './utils/logger';

// Load environment variables - works both locally and in serverless
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Vercel deployment
app.set('trust proxy', 1);

// Rate limiting with proper configuration for serverless
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  validate: {
    trustProxy: false, // Disable the validation warning
    xForwardedForHeader: false, // Disable the validation warning
  },
});

// Middleware
app.use(helmet());

// Dynamic CORS configuration for different environments
const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = [
      process.env.CLIENT_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      'http://localhost:3000',
      'https://localhost:3000'
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, etc)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In production, be more restrictive
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'));
      } else {
        callback(null, true); // Allow in development
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(limiter);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection middleware for serverless
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    logger.error('Database connection failed:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    database: 'connected'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes); // No auth required for webhooks
app.use('/api/system', systemRoutes); // No auth required for system health checks
app.use('/api/analysis', authMiddleware, analysisRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info(`🚀 SecureFlow API server running on port ${PORT}`);
  logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
  logger.info(`🗄️  Using MongoDB database`);
});

export default app;
