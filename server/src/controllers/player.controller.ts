import { Request, Response } from 'express';
import { Player } from '../models/player.model';

export const playerController = {
  // Create a new player
  create: async (req: Request, res: Response) => {
    try {
      const player = await Player.create(req.body);
      res.status(201).json(player);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error creating player' });
    }
  },

  // Get all players
  getAll: async (_req: Request, res: Response) => {
    try {
      const players = await Player.find().populate('teams', 'name');
      console.log('Fetched players:', players);
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
      res.json(player);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error getting player' });
    }
  },

  // Update player
  update: async (req: Request, res: Response) => {
    try {
      const player = await Player.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      ).populate('teams', 'name');
      
      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }
      res.json(player);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error updating player' });
    }
  },

  // Delete player
  delete: async (req: Request, res: Response) => {
    try {
      const player = await Player.findByIdAndDelete(req.params.id);
      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }
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