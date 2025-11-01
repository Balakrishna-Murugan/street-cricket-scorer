import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Match } from '../models/match.model';
import { Team } from '../models/team.model';
import { LiveScoringService, BallData } from '../services/liveScoringService';

export const matchController = {
  // Create a new match
  create: async (req: Request, res: Response) => {
    try {
      // Initialize innings with teams and proper structure
      // Attach createdBy from authenticated user if available
      if (req.user && req.user._id) {
        req.body.createdBy = req.user._id;
      }

      // Enforce guest/viewer creation limit and overs cap
      const userRole = typeof req.user?.userRole === 'string' ? req.user.userRole.toLowerCase() : undefined;
      const isGuestUser = req.user?.isGuest === true || userRole === 'guest';
      const isViewerUser = userRole === 'viewer';

      if (isGuestUser || isViewerUser) {
        // Ensure createdBy is set
        const creatorId = req.user._id;
        const existingCount = await Match.countDocuments({ createdBy: creatorId });
        if (existingCount >= 1) {
          return res.status(403).json({ message: 'Guest/viewer users can create only 1 match' });
        }

        // Enforce guest/viewer overs cap: maximum 2 overs per match (i.e., less than 3 overs)
        const requestedOvers = Number(req.body.overs) || 2;
        const cappedOvers = Math.min(2, Math.max(1, Math.floor(requestedOvers)));
        req.body.overs = cappedOvers;
      }

      const match = new Match({
        ...req.body,
        currentInnings: 0,
        matchSettings: {
          oversPerBowler: Math.max(1, Math.min(4, Math.floor(req.body.overs * 0.2))),
          maxPlayersPerTeam: 11
        },
        bowlerRotation: {
          bowlerOversCount: new Map(),
          availableBowlers: []
        },
        innings: [{
          battingTeam: req.body.team1,
          bowlingTeam: req.body.team2,
          totalRuns: 0,
          wickets: 0,
          overs: 0,
          balls: 0,
          isCompleted: false,
          battingStats: [],
          bowlingStats: [],
          currentState: {
            currentOver: 0,
            currentBall: 0,
            onStrikeBatsman: null,
            offStrikeBatsman: null,
            currentBowler: null,
            lastBallRuns: 0
          },
          extras: {
            wides: 0,
            noBalls: 0,
            byes: 0,
            legByes: 0,
            total: 0
          },
          runRate: 0
        }]
      });

      await match.save();
      
      // Return the match with populated teams
      const populatedMatch = await Match.findById(match._id)
        .populate('team1', 'name')
        .populate('team2', 'name');
      
      res.status(201).json(populatedMatch);
    } catch (error: any) {
      console.error('Error creating match:', error);
      res.status(400).json({ message: error.message || 'Error creating match' });
    }
  },

  // Get all matches
  getAll: async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;

      let query = {};
      // If authenticated and admin, show all matches
      if (req.user && (req.user.userRole === 'admin' || req.user.userRole === 'superadmin')) {
        query = {};
      } else if (req.user && req.user._id) {
        // authenticated non-admins see only matches they created
        query = { createdBy: req.user._id };
      } else if (userId) {
        query = { createdBy: userId };
      }
      
      const matches = await Match.find(query)
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

      // Enforce ownership for non-admins
      if (req.user && (req.user.userRole === 'admin' || req.user.userRole === 'superadmin')) {
        console.log('Match found (admin):', match.status);
        return res.json(match);
      }

      if (req.user && (match as any).createdBy && (match as any).createdBy.toString() === req.user._id.toString()) {
        console.log('Match found (owner):', match.status);
        return res.json(match);
      }

      return res.status(403).json({ message: 'Access denied' });
    } catch (error: any) {
      console.error('Match retrieval error:', error);
      res.status(500).json({ message: error.message || 'Error retrieving match' });
    }
  },

  // Update match
  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate required fields
      if (!updateData.team1 || !updateData.team2) {
        return res.status(400).json({ message: 'Both teams must be selected' });
      }

      if (!updateData.overs || updateData.overs <= 0) {
        return res.status(400).json({ message: 'Number of overs must be greater than 0' });
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(updateData.team1) || !mongoose.Types.ObjectId.isValid(updateData.team2)) {
        return res.status(400).json({ message: 'Invalid team ID format' });
      }

      if (updateData.tossWinner && !mongoose.Types.ObjectId.isValid(updateData.tossWinner)) {
        return res.status(400).json({ message: 'Invalid toss winner ID format' });
      }

      const match = await Match.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      )
        .populate('team1', 'name')
        .populate('team2', 'name')
        .populate('tossWinner', 'name')
        .populate('innings.battingTeam', 'name')
        .populate('innings.bowlingTeam', 'name')
        .populate('innings.battingStats.player', 'name')
        .populate('innings.bowlingStats.player', 'name')
        .populate('innings.currentState.onStrikeBatsman', 'name')
        .populate('innings.currentState.offStrikeBatsman', 'name')
        .populate('innings.currentState.currentBowler', 'name');

      if (!match) {
        return res.status(404).json({ message: 'Match not found' });
      }
      res.json(match);
    } catch (error: any) {
      console.error('Error updating match:', error);
      res.status(400).json({ message: error.message || 'Error updating match' });
    }
  },

  // Update match score
  // Process a single ball (NEW ENHANCED METHOD)
  processBall: async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;
      const ballData: BallData = {
        matchId,
        ...req.body
      };

      console.log('Processing ball:', ballData);

      const updatedMatch = await LiveScoringService.processBall(ballData);
      
      res.json(updatedMatch);
    } catch (error: any) {
      console.error('Error processing ball:', error);
      res.status(400).json({ message: error.message || 'Error processing ball' });
    }
  },

  // Get bowler rotation options
  getBowlerRotation: async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;
      
      const rotationResult = await LiveScoringService.getBowlerRotation(matchId);
      
      res.json(rotationResult);
    } catch (error: any) {
      console.error('Error getting bowler rotation:', error);
      res.status(500).json({ message: error.message || 'Error getting bowler rotation' });
    }
  },

  // Start new over with bowler
  startNewOver: async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;
      const { bowlerId } = req.body;

      console.log('Starting new over:', { matchId, bowlerId });

      const updatedMatch = await LiveScoringService.startNewOver(matchId, bowlerId);
      
      // Return populated match
      const populatedMatch = await Match.findById(matchId)
        .populate('team1', 'name')
        .populate('team2', 'name')
        .populate('innings.battingStats.player', 'name')
        .populate('innings.bowlingStats.player', 'name')
        .populate('innings.currentState.onStrikeBatsman', 'name')
        .populate('innings.currentState.offStrikeBatsman', 'name')
        .populate('innings.currentState.currentBowler', 'name');

      res.json(populatedMatch);
    } catch (error: any) {
      console.error('Error starting new over:', error);
      res.status(400).json({ message: error.message || 'Error starting new over' });
    }
  },

  // Update current batsmen
  updateBatsmen: async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;
      const { onStrikeBatsman, offStrikeBatsman } = req.body;

      const match = await Match.findById(matchId);
      if (!match) {
        return res.status(404).json({ message: 'Match not found' });
      }

      const currentInnings = match.innings[match.currentInnings];
      if (!currentInnings) {
        return res.status(400).json({ message: 'Current innings not found' });
      }

      // Update current batsmen
      currentInnings.currentState.onStrikeBatsman = onStrikeBatsman;
      currentInnings.currentState.offStrikeBatsman = offStrikeBatsman;

      // Update batting stats to reflect strike status
      currentInnings.battingStats.forEach(stat => {
        stat.isOnStrike = stat.player.toString() === onStrikeBatsman;
      });

      await match.save();

      // Return populated match
      const populatedMatch = await Match.findById(matchId)
        .populate('team1', 'name')
        .populate('team2', 'name')
        .populate('innings.battingStats.player', 'name')
        .populate('innings.currentState.onStrikeBatsman', 'name')
        .populate('innings.currentState.offStrikeBatsman', 'name');

      res.json(populatedMatch);
    } catch (error: any) {
      console.error('Error updating batsmen:', error);
      res.status(400).json({ message: error.message || 'Error updating batsmen' });
    }
  },

  // Send match summary to an email (if SMTP configured on server)
  sendSummary: async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: 'Email is required' });

      const match = await Match.findById(matchId)
        .populate('team1', 'name')
        .populate('team2', 'name')
        .populate('innings.battingStats.player', 'name')
        .populate('innings.bowlingStats.player', 'name')
        .populate('innings.currentState.onStrikeBatsman', 'name')
        .populate('innings.currentState.offStrikeBatsman', 'name');

      if (!match) return res.status(404).json({ message: 'Match not found' });

      // Build a simple summary text
      const summaryLines: string[] = [];
      summaryLines.push(`${(match.team1 as any)?.name || 'Team 1'} vs ${(match.team2 as any)?.name || 'Team 2'}`);
      summaryLines.push(`Date: ${match.date}`);
      summaryLines.push(`Status: ${match.status}`);
      if (match.innings && match.innings.length > 0) {
        match.innings.forEach((inning: any, idx: number) => {
          summaryLines.push(`Innings ${idx + 1}: ${inning.totalRuns}/${inning.wickets} in ${inning.overs} overs`);
        });
      }

      const summaryText = summaryLines.join('\n');

      // If SMTP is configured (via env vars), attempt to send email using nodemailer
      const smtpHost = process.env.SMTP_HOST;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (smtpHost && smtpUser && smtpPass) {
        // dynamic import nodemailer to avoid hard dependency if not configured
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        const mailOptions = {
          from: process.env.EMAIL_FROM || smtpUser,
          to: email,
          subject: `Match Summary: ${(match.team1 as any)?.name || ''} vs ${(match.team2 as any)?.name || ''}`,
          text: summaryText
        };

        const info = await transporter.sendMail(mailOptions);
        return res.json({ message: 'Summary sent', info });
      }

      // If no SMTP, return summary content so client can handle sending
      return res.json({ message: 'No SMTP configured', summary: summaryText });
    } catch (error: any) {
      console.error('Error sending match summary:', error);
      res.status(500).json({ message: error.message || 'Failed to send match summary' });
    }
  },

  // Legacy update score method (kept for backwards compatibility)
  updateScore: async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;
      const scoreUpdate = req.body;

      console.log('Updating match score (legacy):', { matchId });
      console.log('Ball tracking data received:', {
        recentBalls: scoreUpdate.innings?.[0]?.recentBalls?.length || 0,
        currentOverBalls: scoreUpdate.innings?.[0]?.currentOverBalls?.length || 0
      });
      
      // Clean up the score update data
      const cleanScoreUpdate = {
        ...scoreUpdate,
        innings: scoreUpdate.innings.map((inning: any) => ({
          ...inning,
          battingTeam: inning.battingTeam?._id || inning.battingTeam,
          bowlingTeam: inning.bowlingTeam?._id || inning.bowlingTeam,
          // CRITICAL: Explicitly preserve ball tracking arrays
          currentOverBalls: inning.currentOverBalls || [],
          recentBalls: inning.recentBalls || [],
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

      // Check if match should be set to in-progress
      const hasAnyBalls = cleanScoreUpdate.innings.some((inning: any) => 
        (inning.balls && inning.balls > 0) || 
        (inning.battingStats && inning.battingStats.some((stat: any) => stat.balls > 0))
      );
      
      // Set status to in-progress if any balls have been bowled and status is still upcoming
      if (hasAnyBalls && (!scoreUpdate.status || scoreUpdate.status === 'upcoming')) {
        cleanScoreUpdate.status = 'in-progress';
      }

      console.log('Clean score update:', {
        firstInning: {
          recentBalls: cleanScoreUpdate.innings?.[0]?.recentBalls?.length || 0,
          currentOverBalls: cleanScoreUpdate.innings?.[0]?.currentOverBalls?.length || 0
        }
      });
      
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
      
      console.log('Returning match with ball tracking:', {
        firstInning: {
          recentBalls: match.innings?.[0]?.recentBalls?.length || 0,
          currentOverBalls: match.innings?.[0]?.currentOverBalls?.length || 0
        }
      });
      
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