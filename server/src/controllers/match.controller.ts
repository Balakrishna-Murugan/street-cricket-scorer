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
  const isNonAdmin = !(userRole === 'admin' || userRole === 'superadmin');

  if (isNonAdmin) {
        // Ensure createdBy is set
        const creatorId = req.user._id;
        const existingCount = await Match.countDocuments({ createdBy: creatorId });
        if (existingCount >= 1) {
          return res.status(403).json({ message: 'Non-admin users can create only 1 match' });
        }

        // Strict validation: Non-admin users are not allowed to create matches with more than 2 overs.
        // Return a clear error instead of silently capping so the client can show a helpful message.
        const requestedOvers = Number(req.body.overs) || 0;
        if (requestedOvers > 2) {
          return res.status(403).json({ message: 'Non-admin users may not create matches with more than 2 overs' });
        }

        // Normalize overs to a sensible integer between 1 and 2 (default to 2 if not provided)
        const normalized = requestedOvers > 0 ? Math.max(1, Math.floor(requestedOvers)) : 2;
        req.body.overs = Math.min(2, normalized);
      }

      // Prevent duplicate match names per user (allow same name across different users)
      if (req.body.name && req.user && req.user._id) {
        const existingMatch = await Match.findOne({ name: req.body.name.trim(), createdBy: req.user._id });
        if (existingMatch) {
          return res.status(400).json({ message: 'Match name already exists for this user' });
        }
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

      // Build a simple HTML summary so both SMTP and SendGrid API paths can reuse it
      const buildInningsHtml = (inning: any, idx: number) => {
        const heading = idx === 0 ? '1st Innings' : '2nd Innings';
        const batsmenRows = (inning.battingStats || []).map((b: any) => `
            <tr>
              <td style="padding:6px;border:1px solid #ddd">${b.player?.name || b.player || '—'}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:right">${b.runs || 0}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:right">${b.balls || 0}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:right">${b.fours || 0}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:right">${b.sixes || 0}</td>
            </tr>`).join('') || '<tr><td style="padding:6px;border:1px solid #ddd" colspan="5">No batting data</td></tr>';

        const bowlersRows = (inning.bowlingStats || []).map((b: any) => `
            <tr>
              <td style="padding:6px;border:1px solid #ddd">${b.player?.name || b.player || '—'}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:right">${b.overs || 0}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:right">${b.runs || 0}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:right">${b.wickets || 0}</td>
            </tr>`).join('') || '<tr><td style="padding:6px;border:1px solid #ddd" colspan="4">No bowling data</td></tr>';

        const extrasHtml = inning.extras ? `
            <p style="margin:6px 0;font-size:13px"><strong>Extras:</strong> Wides: ${inning.extras.wides || 0}, No-balls: ${inning.extras.noBalls || 0}, Byes: ${inning.extras.byes || 0}, Leg byes: ${inning.extras.legByes || 0}, Total: ${inning.extras.total || 0}</p>
          ` : '';

        return `
            <h3 style="margin-bottom:6px">${heading}: ${inning.totalRuns}/${inning.wickets} (${inning.overs} ov)</h3>
            ${extrasHtml}
            <div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:12px">
              <div style="flex:1;min-width:260px">
                <h4 style="margin:6px 0">Batsmen</h4>
                <table style="border-collapse:collapse;width:100%;font-size:13px">
                  <thead>
                    <tr>
                      <th style="padding:6px;border:1px solid #ddd;text-align:left">Player</th>
                      <th style="padding:6px;border:1px solid #ddd">R</th>
                      <th style="padding:6px;border:1px solid #ddd">B</th>
                      <th style="padding:6px;border:1px solid #ddd">4s</th>
                      <th style="padding:6px;border:1px solid #ddd">6s</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${batsmenRows}
                  </tbody>
                </table>
              </div>
              <div style="flex:1;min-width:220px">
                <h4 style="margin:6px 0">Bowlers</h4>
                <table style="border-collapse:collapse;width:100%;font-size:13px">
                  <thead>
                    <tr>
                      <th style="padding:6px;border:1px solid #ddd;text-align:left">Player</th>
                      <th style="padding:6px;border:1px solid #ddd">O</th>
                      <th style="padding:6px;border:1px solid #ddd">R</th>
                      <th style="padding:6px;border:1px solid #ddd">W</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${bowlersRows}
                  </tbody>
                </table>
              </div>
            </div>`;
      };

      const inningsHtml = (match.innings || []).map((inn: any, idx: number) => buildInningsHtml(inn, idx)).join('<hr style="border:none;border-top:1px solid #eee;margin:12px 0"/>');

      const html = `
          <div style="font-family:Segoe UI, Roboto, Helvetica, Arial, sans-serif;color:#222">
            <div style="background:linear-gradient(135deg,#020e43 0%,#764ba2 100%);color:white;padding:16px;border-radius:6px">
              <h2 style="margin:0">${(match.team1 as any)?.name || 'Team 1'} vs ${(match.team2 as any)?.name || 'Team 2'}</h2>
              <div style="margin-top:6px;font-size:13px;opacity:0.95">${new Date(match.date).toLocaleString()}</div>
            </div>
            <div style="padding:12px;margin-top:12px;background:#fafafa;border-radius:6px;border:1px solid #f0f0f0">
              <h3 style="margin-top:0">Match Summary</h3>
              <p style="margin:6px 0"><strong>Status:</strong> ${match.status}</p>
              ${match.result ? `<p style="margin:6px 0"><strong>Result:</strong> ${match.result}</p>` : ''}
              ${inningsHtml}
            </div>
            <div style="margin-top:12px;font-size:12px;color:#666">This summary was generated by Street Cricket Scorer</div>
          </div>`;

      // Prefer SendGrid Web API if configured (avoids SMTP egress issues)
      const sendgridKey = process.env.SENDGRID_API_KEY;
      if (sendgridKey) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const sg = require('@sendgrid/mail');
        sg.setApiKey(sendgridKey);

        const msg = {
          to: email,
          from: process.env.EMAIL_FROM || (process.env.SMTP_USER || 'no-reply@streetcricket.app'),
          subject: `Match Summary: ${(match.team1 as any)?.name || ''} vs ${(match.team2 as any)?.name || ''}`,
          text: summaryText,
          html
        };

        try {
          const resp = await sg.send(msg);
          return res.json({ message: 'Summary sent (sendgrid)', info: resp });
        } catch (err: any) {
          console.error('Error sending match summary via SendGrid:', err.response || err);
          // fall through to try SMTP if configured
        }
      }

      // If SendGrid not configured or failed, fall back to SMTP if available
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
          text: summaryText,
          html
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