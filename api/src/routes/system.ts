import { Router, Request, Response } from 'express';
import logger from '../utils/logger';

const router = Router();

// Validate system credentials and dependencies
router.get('/validate-credentials', async (req: Request, res: Response) => {
  try {
    const validationResults = {
      mongodb: false,
      geminiAI: false,
      environment: {
        mongodbUri: !!process.env.MONGODB_URI,
        jwtSecret: !!process.env.JWT_SECRET,
        geminiApiKey: !!process.env.GEMINI_API_KEY,
      },
      errors: [] as string[]
    };

    // Check MongoDB connection
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        validationResults.mongodb = true;
      } else {
        validationResults.errors.push('MongoDB is not connected');
      }
    } catch (error) {
      validationResults.errors.push('MongoDB connection error');
    }

    // Check Gemini AI API key (required)
    if (!process.env.GEMINI_API_KEY) {
      validationResults.errors.push('GEMINI_API_KEY is required for AI analysis');
    } else {
      try {
        // Basic validation of API key format
        if (process.env.GEMINI_API_KEY.startsWith('AIza') && process.env.GEMINI_API_KEY.length > 30) {
          validationResults.geminiAI = true;
          logger.info('✅ Gemini API key configured');
        } else {
          validationResults.errors.push('Invalid Gemini API key format');
        }
      } catch (error: any) {
        validationResults.geminiAI = false;
        validationResults.errors.push(`Gemini API key validation error: ${error.message}`);
        logger.error('❌ Gemini API key validation failed:', error);
      }
    }

    // Check additional required environment variables
    if (!process.env.MONGODB_URI) {
      validationResults.errors.push('MONGODB_URI environment variable is missing');
    }

    if (!process.env.JWT_SECRET) {
      validationResults.errors.push('JWT_SECRET environment variable is missing');
    }

    const isHealthy = validationResults.mongodb && 
                      validationResults.geminiAI && 
                      validationResults.errors.length === 0;

    if (isHealthy) {
      res.json({
        status: 'healthy',
        message: 'All system credentials and dependencies are properly configured',
        details: validationResults
      });
    } else {
      res.status(500).json({
        status: 'unhealthy',
        message: 'Some system dependencies are not properly configured',
        details: validationResults
      });
    }

  } catch (error) {
    logger.error('System validation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to validate system credentials',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get system status
router.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

export default router;