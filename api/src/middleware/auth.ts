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
    
    console.log('Auth middleware - headers:', {
      authorization: authHeader ? 'Bearer ***' : 'missing',
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin
    });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth middleware - no valid authorization header');
      return res.status(401).json({
        error: 'No authorization token provided'
      });
    }

    const token = authHeader.substring(7);
    console.log('Auth middleware - token length:', token.length);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
      console.log('Auth middleware - token decoded successfully, userId:', decoded.userId);

      // Get user from database
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        console.log('Auth middleware - user not found for userId:', decoded.userId);
        return res.status(401).json({
          error: 'User not found'
        });
      }

      console.log('Auth middleware - user found:', user.email);
      req.user = user;
      next();
    } catch (jwtError) {
      console.log('Auth middleware - JWT verification failed:', jwtError instanceof Error ? jwtError.message : 'Unknown error');
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
