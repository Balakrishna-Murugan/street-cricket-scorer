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
      const players = await Player.find();
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
  }
};