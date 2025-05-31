import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { admin } from '../services/firebase';
import logger from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: string;
  };
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
      // Verify Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(token);

      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        role: decodedToken.role || 'VIEWER',
      };

      next();
    } catch (firebaseError) {
      // Fallback to JWT verification for development
      if (process.env.NODE_ENV === 'development') {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
          req.user = {
            uid: decoded.uid,
            email: decoded.email,
            role: decoded.role || 'VIEWER',
          };
          next();
        } catch (jwtError) {
          return res.status(401).json({
            error: 'Invalid token'
          });
        }
      } else {
        return res.status(401).json({
          error: 'Invalid Firebase token'
        });
      }
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication service error'
    });
  }
};

export const requireRole = (requiredRole: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const roleHierarchy = {
      'VIEWER': 0,
      'DEVELOPER': 1,
      'SECURITY_ANALYST': 2,
      'ADMIN': 3,
    };

    const userLevel = roleHierarchy[req.user.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};
