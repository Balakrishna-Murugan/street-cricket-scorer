import { Request, Response } from 'express';
import { Player } from '../models/player.model';
import { Match } from '../models/match.model';

export const playerController = {
  // Create a new player
  create: async (req: Request, res: Response) => {
    try {
      // Attach createdBy from authenticated user if available
      if (req.user && req.user._id) {
        req.body.createdBy = req.user._id;
      }

      // Enforce creation limits for non-admin users: max 6 players per user
      const creatorRole = req.user?.userRole;
      const isAdmin = creatorRole === 'admin' || creatorRole === 'superadmin';
      if (!isAdmin) {
        // Total players created by this user
        const existingCount = await Player.countDocuments({ createdBy: req.user._id });
        const PLAYER_LIMIT = 6;
        if (existingCount >= PLAYER_LIMIT) {
          return res.status(403).json({ message: `Non-admin users can create up to ${PLAYER_LIMIT} players`, limit: PLAYER_LIMIT, currentCount: existingCount });
        }

        // If a team is selected for this player, enforce per-user-per-team limit as well
        const teamId = Array.isArray(req.body.teams) && req.body.teams.length > 0 ? (typeof req.body.teams[0] === 'string' ? req.body.teams[0] : req.body.teams[0]?._id) : null;
        if (teamId) {
          const teamCount = await Player.countDocuments({ createdBy: req.user._id, teams: teamId });
          if (teamCount >= PLAYER_LIMIT) {
            return res.status(403).json({ message: `You have reached the player creation limit (${PLAYER_LIMIT}) for the selected team`, limit: PLAYER_LIMIT, currentCount: teamCount });
          }
        }
      }

      // Prevent duplicate player names per user (allow same name across different users)
      if (req.body.name && req.user && req.user._id) {
        const existingPlayer = await Player.findOne({ name: req.body.name.trim(), createdBy: req.user._id });
        if (existingPlayer) {
          return res.status(400).json({ message: 'Player name already exists for this user' });
        }
      }

      const player = await Player.create(req.body);
      res.status(201).json(player);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error creating player' });
    }
  },

  // Get all players
  getAll: async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
  let players: any[] = [];
      if (req.user && (req.user.userRole === 'admin' || req.user.userRole === 'superadmin')) {
        players = await Player.find().populate('teams', 'name');
      } else if (req.user && req.user._id) {
        // Only return players created by this user
        players = await Player.find({ createdBy: req.user._id }).populate('teams', 'name');
      } else {
        players = [];
      }
  res.json(players);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error getting players' });
    }
  },

  // Get player by ID
  getById: async (req: Request, res: Response) => {
    try {
      const player = await Player.findById(req.params.id).populate('teams', 'name');
      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }
      // Enforce ownership for non-admins
      if (req.user && (req.user.userRole === 'admin' || req.user.userRole === 'superadmin')) {
        return res.json(player);
      }

      if (req.user && (player as any).createdBy && (player as any).createdBy.toString() === req.user._id.toString()) {
        return res.json(player);
      }

      return res.status(403).json({ message: 'Access denied' });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error getting player' });
    }
  },

  // Get conflicts (matches referencing any of the player's teams)
  conflicts: async (req: Request, res: Response) => {
    try {
      const player = await Player.findById(req.params.id);
      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }

      const playerTeams = (player as any).teams || [];
      if (playerTeams.length === 0) {
        return res.json({ conflicts: [] });
      }

      const conflictMatches = await Match.find({
        $or: [{ team1: { $in: playerTeams } }, { team2: { $in: playerTeams } }]
      }).populate('team1', 'name').populate('team2', 'name');

      const conflicts = conflictMatches.map((m: any) => {
        const t1 = m.team1?.name || 'Team1';
        const t2 = m.team2?.name || 'Team2';
        const dateStr = m.date ? new Date(m.date).toISOString().split('T')[0] : '';
        return { _id: m._id, label: `${t1} vs ${t2}${dateStr ? ' on ' + dateStr : ''}` };
      });

      res.json({ conflicts });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error checking player conflicts' });
    }
  },

  // Update player
  update: async (req: Request, res: Response) => {
    try {
      // Only allow update by admin/superadmin or the creator
      const existing = await Player.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: 'Player not found' });
      }

      if (!(req.user && (req.user.userRole === 'admin' || req.user.userRole === 'superadmin')) ) {
        if (!(req.user && (existing as any).createdBy && (existing as any).createdBy.toString() === req.user._id.toString())) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }

      const player = await Player.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      ).populate('teams', 'name');

      res.json(player);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error updating player' });
    }
  },

  // Delete player
  delete: async (req: Request, res: Response) => {
    try {
      const existing = await Player.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: 'Player not found' });
      }

      if (!(req.user && (req.user.userRole === 'admin' || req.user.userRole === 'superadmin')) ) {
        if (!(req.user && (existing as any).createdBy && (existing as any).createdBy.toString() === req.user._id.toString())) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }

      // Prevent deletion if player belongs to any team that is involved in matches
      const playerTeams = (existing as any).teams || [];
      if (playerTeams.length > 0) {
        // Find any matches that reference any of these teams
        const conflictMatches = await Match.find({
          $or: [{ team1: { $in: playerTeams } }, { team2: { $in: playerTeams } }]
        }).populate('team1', 'name').populate('team2', 'name');

        if (conflictMatches && conflictMatches.length > 0) {
          const conflicts = conflictMatches.map((m: any) => {
            const t1 = m.team1?.name || 'Team1';
            const t2 = m.team2?.name || 'Team2';
            const dateStr = m.date ? new Date(m.date).toISOString().split('T')[0] : '';
            return { _id: m._id, label: `${t1} vs ${t2}${dateStr ? ' on ' + dateStr : ''}` };
          });

          return res.status(403).json({
            message: 'Player cannot be deleted because they belong to a team involved in one or more matches',
            conflicts
          });
        }
      }

      await Player.findByIdAndDelete(req.params.id);
      res.json({ message: 'Player deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error deleting player' });
    }
  },

  // Promote player to admin (SuperAdmin only)
  promoteToAdmin: async (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;

      const player = await Player.findById(playerId);
      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }

      // Check if already admin or superadmin
      if (player.userRole === 'admin' || player.userRole === 'superadmin') {
        return res.status(400).json({ message: 'Player is already an admin or superadmin' });
      }

      // Update user role to admin
      player.userRole = 'admin';
      await player.save();

      res.json({
        message: 'Player promoted to admin successfully',
        player: {
          _id: player._id,
          name: player.name,
          username: player.username,
          email: player.email,
          userRole: player.userRole
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error promoting player to admin' });
    }
  },

  // Demote admin to player (SuperAdmin only)
  demoteFromAdmin: async (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;

      const player = await Player.findById(playerId);
      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }

      // Check if user is admin
      if (player.userRole !== 'admin') {
        return res.status(400).json({ message: 'Player is not an admin' });
      }

      // Update user role to player
      player.userRole = 'player';
      await player.save();

      res.json({
        message: 'Admin demoted to player successfully',
        player: {
          _id: player._id,
          name: player.name,
          username: player.username,
          email: player.email,
          userRole: player.userRole
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error demoting admin' });
    }
  },

  // Update multiple players' teams (when team membership changes)
  updatePlayerTeams: async (req: Request, res: Response) => {
    try {
      const { playerUpdates } = req.body;

      if (!Array.isArray(playerUpdates)) {
        return res.status(400).json({ message: 'playerUpdates must be an array' });
      }

      const updatePromises = playerUpdates.map(async (update: { playerId: string; teams: string[] }) => {
        const { playerId, teams } = update;
        return Player.findByIdAndUpdate(
          playerId,
          { $set: { teams } },
          { new: true, runValidators: true }
        ).populate('teams', 'name');
      });

      const updatedPlayers = await Promise.all(updatePromises);

      // Filter out null results (players not found)
      const successfulUpdates = updatedPlayers.filter(player => player !== null);

      res.json({
        message: `Updated ${successfulUpdates.length} players`,
        players: successfulUpdates
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error updating player teams' });
    }
  },
};