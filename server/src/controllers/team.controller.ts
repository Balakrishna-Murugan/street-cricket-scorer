import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Team } from '../models/team.model';
import { Player } from '../models/player.model';
import { Match } from '../models/match.model';

export const teamController = {
  // Create a new team
  create: async (req: Request, res: Response) => {
    try {
      const teamData = { ...req.body };
      console.log('Creating team with data:', JSON.stringify(teamData, null, 2)); // Better debug log
      
      // Handle captain field properly
      if (teamData.captain === '' || teamData.captain === null || teamData.captain === undefined) {
        delete teamData.captain;
        console.log('Captain field removed from teamData'); // Debug log
      } else {
        // Validate captain ID is a valid ObjectId and player exists
        if (!mongoose.Types.ObjectId.isValid(teamData.captain)) {
          console.log('Invalid captain ID format:', teamData.captain); // Debug log
          return res.status(400).json({ message: 'Invalid captain ID format' });
        }
        
        const captainExists = await Player.findById(teamData.captain);
        if (!captainExists) {
          console.log('Captain player not found:', teamData.captain); // Debug log
          return res.status(400).json({ message: 'Captain player not found' });
        }
      }
      
      // Attach createdBy from authenticated user if available
      if (req.user && req.user._id) {
        teamData.createdBy = req.user._id;
      }

      // Enforce guest/viewer creation limit: max 2 teams
      const creatorRole = req.user?.userRole;
      if (creatorRole === 'guest' || creatorRole === 'viewer') {
        const existingCount = await Team.countDocuments({ createdBy: req.user._id });
        if (existingCount >= 2) {
          return res.status(403).json({ message: 'Guest/viewer users can create up to 2 teams' });
        }
      }

      console.log('Final teamData before save:', JSON.stringify(teamData, null, 2)); // Debug log
      const team = new Team(teamData);
      const savedTeam = await team.save();
      console.log('Team saved successfully:', savedTeam._id); // Debug log
      res.status(201).json(savedTeam);
    } catch (error: any) {
      console.error('Detailed error creating team:', {
        message: error.message,
        name: error.name,
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
        errors: error.errors
      }); // Detailed debug log
      
      // Handle specific MongoDB errors
      if (error.code === 11000) {
        return res.status(400).json({ message: 'Team name already exists' });
      }
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        return res.status(400).json({ message: `Validation error: ${validationErrors.join(', ')}` });
      }
      
      res.status(400).json({ message: error.message || 'Error creating team' });
    }
  },

  // Get all teams
  getAll: async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
  let teams: any[] = [];
      if (req.user && (req.user.userRole === 'admin' || req.user.userRole === 'superadmin')) {
        teams = await Team.find()
          .populate('captain', 'name')
          .populate('members', 'name role');
      } else if (req.user && req.user._id) {
        // Only return teams created by this user
        teams = await Team.find({ createdBy: req.user._id })
          .populate('captain', 'name')
          .populate('members', 'name role');
      } else {
        teams = [];
      }
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
      // Enforce ownership for non-admins
      if (req.user && (req.user.userRole === 'admin' || req.user.userRole === 'superadmin')) {
        return res.json(team);
      }

      if (req.user && (team as any).createdBy && (team as any).createdBy.toString() === req.user._id.toString()) {
        return res.json(team);
      }

      return res.status(403).json({ message: 'Access denied' });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error retrieving team' });
    }
  },

  // Get conflicts (in-progress matches referencing this team)
  conflicts: async (req: Request, res: Response) => {
    try {
      const existing = await Team.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: 'Team not found' });
      }

      const inProgressMatches = await Match.find({
        $or: [{ team1: existing._id }, { team2: existing._id }],
        status: 'in-progress'
      }).populate('team1', 'name').populate('team2', 'name');

      if (!inProgressMatches || inProgressMatches.length === 0) {
        return res.json({ conflicts: [] });
      }

      const conflicts = inProgressMatches.map((m: any) => {
        const t1 = m.team1?.name || 'Team1';
        const t2 = m.team2?.name || 'Team2';
        const dateStr = m.date ? new Date(m.date).toISOString().split('T')[0] : '';
        return { _id: m._id, label: `${t1} vs ${t2}${dateStr ? ' on ' + dateStr : ''}` };
      });

      res.json({ conflicts });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error checking team conflicts' });
    }
  },

  // Update team
  update: async (req: Request, res: Response) => {
    try {
      const updateData = { ...req.body };
      console.log('Updating team with data:', updateData); // Debug log
      
      // Handle captain field properly
      if (updateData.captain === '' || updateData.captain === null || updateData.captain === undefined) {
        updateData.captain = null;
      } else if (updateData.captain) {
        // Validate captain ID is a valid ObjectId and player exists
        if (!mongoose.Types.ObjectId.isValid(updateData.captain)) {
          return res.status(400).json({ message: 'Invalid captain ID format' });
        }
        
        const captainExists = await Player.findById(updateData.captain);
        if (!captainExists) {
          return res.status(400).json({ message: 'Captain player not found' });
        }
      }
      
      const existing = await Team.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: 'Team not found' });
      }

      // Only allow update by admin/superadmin or the creator
      if (!(req.user && (req.user.userRole === 'admin' || req.user.userRole === 'superadmin')) ) {
        if (!(req.user && (existing as any).createdBy && (existing as any).createdBy.toString() === req.user._id.toString())) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }

      const team = await Team.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      ).populate('captain members');
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      res.json(team);
    } catch (error: any) {
      console.error('Error updating team:', error); // Debug log
      res.status(400).json({ message: error.message || 'Error updating team' });
    }
  },

  // Delete team
  delete: async (req: Request, res: Response) => {
    try {
      const existing = await Team.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: 'Team not found' });
      }

      if (!(req.user && (req.user.userRole === 'admin' || req.user.userRole === 'superadmin')) ) {
        if (!(req.user && (existing as any).createdBy && (existing as any).createdBy.toString() === req.user._id.toString())) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }

      // Prevent deletion if this team is part of an in-progress match
      const inProgressMatches = await Match.find({
        $or: [{ team1: existing._id }, { team2: existing._id }],
        status: 'in-progress'
      }).populate('team1', 'name').populate('team2', 'name');

      if (inProgressMatches && inProgressMatches.length > 0) {
        const conflicts = inProgressMatches.map((m: any) => {
          const t1 = m.team1?.name || 'Team1';
          const t2 = m.team2?.name || 'Team2';
          const dateStr = m.date ? new Date(m.date).toISOString().split('T')[0] : '';
          return { _id: m._id, label: `${t1} vs ${t2}${dateStr ? ' on ' + dateStr : ''}` };
        });

        return res.status(403).json({
          message: 'Team cannot be deleted while a match involving the team is in progress',
          conflicts
        });
      }

      await Team.findByIdAndDelete(req.params.id);
      res.json({ message: 'Team deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error deleting team' });
    }
  }
};