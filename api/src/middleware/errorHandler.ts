import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

export const errorHandler = (
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  const status = error.status || error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && status === 500) {
    return res.status(500).json({
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
    });
  }

  res.status(status).json({
    error: message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error,
    }),
  });
};
