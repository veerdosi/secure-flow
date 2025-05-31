import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { initializeFirebase } from './services/firebase';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import analysisRoutes from './routes/analysis';
import projectRoutes from './routes/projects';
import webhookRoutes from './routes/webhooks';
import logger from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Firebase
initializeFirebase();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Routes
app.use('/api/webhooks', webhookRoutes); // No auth required for webhooks
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
});

export default app;
