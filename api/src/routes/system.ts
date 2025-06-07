import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { connectDB } from '../models';
import logger from '../utils/logger';

const router = Router();

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Ensure database connection
    await connectDB();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected',
      services: {
        mongodb: 'connected',
        ai: 'ready'
      }
    };

    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      health.status = 'degraded';
      health.database = 'disconnected';
      health.services.mongodb = 'disconnected';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Validate system credentials and configuration
router.get('/validate', async (req: Request, res: Response) => {
  try {
    // Ensure database connection
    await connectDB();
    
    const validation = {
      status: 'healthy',
      details: {
        environment: {
          mongodbUri: !!process.env.MONGODB_URI,
          geminiApiKey: !!process.env.GEMINI_API_KEY,
          jwtSecret: !!process.env.JWT_SECRET,
          clientUrl: !!process.env.CLIENT_URL,
        },
        services: {
          mongodb: mongoose.connection.readyState === 1,
          ai: !!process.env.GEMINI_API_KEY,
        },
        errors: [] as string[]
      }
    };

    // Check required environment variables
    if (!process.env.MONGODB_URI) {
      validation.details.errors.push('MONGODB_URI environment variable is required');
    }
    if (!process.env.GEMINI_API_KEY) {
      validation.details.errors.push('GEMINI_API_KEY environment variable is required for AI analysis');
    }
    if (!process.env.JWT_SECRET) {
      validation.details.errors.push('JWT_SECRET environment variable is required for authentication');
    }

    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      validation.details.errors.push('MongoDB connection is not established');
      validation.details.services.mongodb = false;
    }

    // Determine overall status
    if (validation.details.errors.length > 0) {
      validation.status = 'error';
    }

    const statusCode = validation.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(validation);
  } catch (error) {
    logger.error('System validation failed:', error);
    res.status(503).json({
      status: 'error',
      details: {
        errors: ['System validation failed'],
        environment: {},
        services: {}
      }
    });
  }
});

// Get system metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        state: mongoose.connection.readyState,
        name: mongoose.connection.name || 'unknown'
      },
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get system metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve system metrics' });
  }
});

export default router;