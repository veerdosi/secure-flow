import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No authorization token provided'
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;

      // Get user from database
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return res.status(401).json({
          error: 'User not found'
        });
      }

      req.user = user;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication service error'
    });
  }
};
