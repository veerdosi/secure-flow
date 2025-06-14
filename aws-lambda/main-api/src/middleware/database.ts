import { Request, Response, NextFunction } from 'express';
import { connectDB } from '../models';
import logger from '../utils/logger';

export const ensureDBConnection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    logger.error('Database connection failed:', error);
    res.status(503).json({ error: 'Database connection failed' });
  }
};
