import { Request, Response } from 'express';
import { Team } from '../models/team.model';

export const teamController = {
  // Create a new team
  create: async (req: Request, res: Response) => {
    try {
      const team = new Team(req.body);
      await team.save();
      res.status(201).json(team);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error creating team' });
    }
  },

  // Get all teams
  getAll: async (_req: Request, res: Response) => {
    try {
      const teams = await Team.find()
        .populate('captain', 'name')
        .populate('members', 'name role');
      res.json(teams);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error retrieving teams' });
    }
  },

  // Get team by ID
  getById: async (req: Request, res: Response) => {
    try {
      const team = await Team.findById(req.params.id)
        .populate('captain', 'name')
        .populate('members', 'name role');
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      res.json(team);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error retrieving team' });
    }
  },

  // Update team
  update: async (req: Request, res: Response) => {
    try {
      const team = await Team.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      ).populate('captain members');
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      res.json(team);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error updating team' });
    }
  },

  // Delete team
  delete: async (req: Request, res: Response) => {
    try {
      const team = await Team.findByIdAndDelete(req.params.id);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      res.json({ message: 'Team deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error deleting team' });
    }
  }
};