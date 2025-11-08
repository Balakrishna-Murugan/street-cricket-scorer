import { Request, Response, NextFunction } from 'express';
import { Player } from '../models/player.model';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authMiddleware = {
  // Middleware to check if user is authenticated
  requireAuth: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // For now, we'll accept a user id passed in several possible places (headers, body, query)
      // In a real app, you'd verify JWT tokens or session cookies
      const header = req.headers as Record<string, any>;
      const userId = header['user-id'] || header['userid'] || header['userId'] || header['x-user-id'] || req.body?.userId || req.query?.userId || (header.authorization ? String(header.authorization).replace(/^Bearer\s+/i, '') : undefined);

      console.log('authMiddleware: received userId candidate ->', userId);

      if (!userId) {
        console.log('authMiddleware: no userId provided');
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await Player.findById(userId);
      console.log('authMiddleware: lookup user ->', user ? { _id: user._id.toString(), userRole: user.userRole, username: user.username } : null);
      if (!user) {
        console.log('authMiddleware: user not found for id', userId);
        return res.status(401).json({ message: 'User not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Authentication error' });
    }
  },

  // Middleware to check if user is admin or superadmin
  requireAdmin: (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.userRole !== 'admin' && req.user.userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  },

  // Middleware to check if user is superadmin
  requireSuperAdmin: (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Super admin access required' });
    }

    next();
  }
};