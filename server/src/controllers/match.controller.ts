import { Request, Response } from 'express';
import { Match } from '../models/match.model';

export const matchController = {
  // Create a new match
  create: async (req: Request, res: Response) => {
    try {
      // Initialize innings with teams
      const match = new Match({
        ...req.body,
        innings: [{
          battingTeam: req.body.team1,
          bowlingTeam: req.body.team2,
          totalRuns: 0,
          wickets: 0,
          overs: 0,
          battingStats: [],
          bowlingStats: [],
          extras: {
            wides: 0,
            noBalls: 0,
            byes: 0,
            legByes: 0
          }
        }]
      });

      await match.save();
      
      // Return the match with populated teams
      const populatedMatch = await Match.findById(match._id)
        .populate('team1', 'name')
        .populate('team2', 'name');
      
      res.status(201).json(populatedMatch);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error creating match' });
    }
  },

  // Get all matches
  getAll: async (_req: Request, res: Response) => {
    try {
      const matches = await Match.find()
        .populate('team1', 'name')
        .populate('team2', 'name')
        .sort({ date: -1 });
      
      // Transform the response to ensure team objects are properly structured
      const transformedMatches = matches.map(match => {
        return {
          ...match.toObject(),
          team1: match.team1 || { _id: '', name: 'Unknown Team' },
          team2: match.team2 || { _id: '', name: 'Unknown Team' }
        };
      });
      
      res.json(transformedMatches);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error retrieving matches' });
    }
  },

  // Get match by ID
  getById: async (req: Request, res: Response) => {
    try {
      console.log('Fetching match with ID:', req.params.id);
      
      const match = await Match.findById(req.params.id)
        .populate('team1', 'name')
        .populate('team2', 'name')
        .populate('tossWinner', 'name')
        .populate({
          path: 'innings',
          populate: [
            { path: 'battingTeam', select: 'name' },
            { path: 'bowlingTeam', select: 'name' },
            { 
              path: 'battingStats.player',
              select: 'name battingStyle'
            },
            { 
              path: 'bowlingStats.player',
              select: 'name bowlingStyle'
            }
          ]
        });

      if (!match) {
        console.log('Match not found with ID:', req.params.id);
        return res.status(404).json({ message: 'Match not found' });
      }

      console.log('Match found:', match.status);
      res.json(match);
    } catch (error: any) {
      console.error('Match retrieval error:', error);
      res.status(500).json({ message: error.message || 'Error retrieving match' });
    }
  },

  // Update match
  update: async (req: Request, res: Response) => {
    try {
      const match = await Match.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      )
        .populate('team1', 'name')
        .populate('team2', 'name')
        .populate('innings.battingTeam')
        .populate('innings.bowlingTeam')
        .populate('innings.battingStats.playerId', 'name')
        .populate('innings.bowlingStats.playerId', 'name');

      if (!match) {
        return res.status(404).json({ message: 'Match not found' });
      }
      res.json(match);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error updating match' });
    }
  },

  // Update match score
  updateScore: async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;
      const scoreUpdate = req.body;

      console.log('Updating match score:', { matchId, scoreUpdate });
      
      // Clean up the score update data
      const cleanScoreUpdate = {
        ...scoreUpdate,
        innings: scoreUpdate.innings.map((inning: any) => ({
          ...inning,
          battingTeam: inning.battingTeam?._id || inning.battingTeam,
          bowlingTeam: inning.bowlingTeam?._id || inning.bowlingTeam,
          battingStats: inning.battingStats.map((stat: any) => ({
            ...stat,
            player: stat.player?._id || stat.player,
          })),
          bowlingStats: inning.bowlingStats.map((stat: any) => ({
            ...stat,
            player: stat.player?._id || stat.player,
          }))
        }))
      };

      console.log('Clean score update:', cleanScoreUpdate);
      
      const match = await Match.findByIdAndUpdate(
        matchId,
        { $set: cleanScoreUpdate },
        { new: true, runValidators: true }
      )
      .populate('team1', 'name')
      .populate('team2', 'name')
      .populate('innings.battingTeam', 'name')
      .populate('innings.bowlingTeam', 'name')
      .populate('innings.battingStats.player', 'name')
      .populate('innings.bowlingStats.player', 'name');

      if (!match) {
        return res.status(404).json({ message: 'Match not found' });
      }
      res.json(match);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error updating match score' });
    }
  },

  // Delete match
  delete: async (req: Request, res: Response) => {
    try {
      const match = await Match.findByIdAndDelete(req.params.id);
      if (!match) {
        return res.status(404).json({ message: 'Match not found' });
      }
      res.json({ message: 'Match deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Error deleting match' });
    }
  }
};