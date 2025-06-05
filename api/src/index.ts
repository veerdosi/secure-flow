import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './models';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import analysisRoutes from './routes/analysis';
import projectRoutes from './routes/projects';
import webhookRoutes from './routes/webhooks';
import systemRoutes from './routes/system';
import logger from './utils/logger';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Vercel deployment
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Rate limiting with proper configuration for serverless
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  trustProxy: true,
  validate: {
    trustProxy: false, // Disable the validation warning
    xForwardedForHeader: false, // Disable the validation warning
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(limiter);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
