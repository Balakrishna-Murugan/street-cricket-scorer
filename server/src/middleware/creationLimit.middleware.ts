import { Request, Response, NextFunction } from 'express';
import { Player } from '../models/player.model';
import { Team } from '../models/team.model';

export const creationLimitMiddleware = {
  // Ensure guest/viewer users cannot create more than limits
  checkPlayerLimit: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: 'Authentication required' });

      const role = user.userRole;
      if (role === 'guest' || role === 'viewer') {
        const count = await Player.countDocuments({ createdBy: user._id });
        if (count >= 12) {
          return res.status(403).json({ message: 'Guest/viewer users can create up to 12 players' });
        }
      }

      next();
    } catch (err: any) {
      console.error('Error in checkPlayerLimit middleware:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  checkTeamLimit: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: 'Authentication required' });

      const role = user.userRole;
      if (role === 'guest' || role === 'viewer') {
        const count = await Team.countDocuments({ createdBy: user._id });
        if (count >= 2) {
          return res.status(403).json({ message: 'Guest/viewer users can create up to 2 teams' });
        }
      }

      next();
    } catch (err: any) {
      console.error('Error in checkTeamLimit middleware:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
