import mongoose from 'mongoose';
import { Match, IMatch } from '../models/match.model';
import Over, { IBall, IOver } from '../models/over.model';

export interface BallData {
  matchId: string;
  runs: number;
  batsmanId: string;
  bowlerId: string;
  extras?: {
    type: 'wide' | 'no-ball' | 'bye' | 'leg-bye';
    runs: number;
  };
  isWicket: boolean;
  dismissalType?: string;
  dismissedPlayerId?: string;
  fielderId?: string;
}

export interface BowlerRotationResult {
  availableBowlers: string[];
  recommendedBowler?: string;
  canBowl: boolean;
  reason?: string;
}

export class LiveScoringService {
  
  /**
   * Calculate accurate overs representation
   * @param balls Total balls bowled
   * @returns Overs in format like 3.4 (3 complete overs, 4 balls)
   */
  static calculateOvers(balls: number): number {
    const completeOvers = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return completeOvers + (remainingBalls / 10);
  }

  /**
   * Calculate balls from overs representation
   * @param overs Overs in format like 3.4
   * @returns Total balls
   */
  static calculateBalls(overs: number): number {
    const completeOvers = Math.floor(overs);
    const remainingBalls = Math.round((overs - completeOvers) * 10);
    return (completeOvers * 6) + remainingBalls;
  }

  /**
   * Get available bowlers for next over based on rotation rules
   */
  static async getBowlerRotation(matchId: string): Promise<BowlerRotationResult> {
    try {
      const match = await Match.findById(matchId)
        .populate('team1 team2')
        .populate({
          path: 'innings.currentState.currentBowler',
          select: 'name'
        });

      if (!match) {
        throw new Error('Match not found');
      }

      const currentInnings = match.innings[match.currentInnings];
      if (!currentInnings) {
        throw new Error('Current innings not found');
      }

      const bowlingTeamId = currentInnings.bowlingTeam;
      const maxOversPerBowler = match.matchSettings.oversPerBowler;
      const lastBowler = match.bowlerRotation.lastBowler;

      // Get all players from bowling team
      // Note: In a real implementation, you'd fetch team members
      // For now, we'll use bowlers who have already bowled or are available
      const allBowlers = currentInnings.bowlingStats.map(stat => stat.player.toString());
      
      // Calculate available bowlers
      const availableBowlers = allBowlers.filter(bowlerId => {
        // Can't bowl consecutive overs (except in special cases)
        if (lastBowler && bowlerId === lastBowler.toString()) {
          return false;
        }

        // Check if bowler has reached max overs limit
        const bowlerStats = currentInnings.bowlingStats.find(
          stat => stat.player.toString() === bowlerId
        );
        const oversCompleted = bowlerStats ? Math.floor(bowlerStats.overs) : 0;
        
        return oversCompleted < maxOversPerBowler;
      });

      // Recommend bowler who has bowled least overs
      let recommendedBowler: string | undefined;
      if (availableBowlers.length > 0) {
        recommendedBowler = availableBowlers.reduce((leastUsed, current) => {
          const currentStats = currentInnings.bowlingStats.find(
            stat => stat.player.toString() === current
          );
          const leastUsedStats = currentInnings.bowlingStats.find(
            stat => stat.player.toString() === leastUsed
          );
          
          const currentOvers = currentStats ? currentStats.overs : 0;
          const leastUsedOvers = leastUsedStats ? leastUsedStats.overs : 0;
          
          return currentOvers < leastUsedOvers ? current : leastUsed;
        });
      }

      return {
        availableBowlers,
        recommendedBowler,
        canBowl: availableBowlers.length > 0,
        reason: availableBowlers.length === 0 ? 'No bowlers available within rotation rules' : undefined
      };

    } catch (error) {
      console.error('Error in bowler rotation:', error);
      throw error;
    }
  }

  /**
   * Process a ball and update all relevant stats
   */
  static async processBall(ballData: BallData): Promise<IMatch> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const match = await Match.findById(ballData.matchId).session(session);
      if (!match) {
        throw new Error('Match not found');
      }

      const currentInnings = match.innings[match.currentInnings];
      if (!currentInnings) {
        throw new Error('Current innings not found');
      }

      // Calculate if this ball counts towards over progression
      const isValidBall = !ballData.extras || 
        !['wide', 'no-ball'].includes(ballData.extras.type);

      // Update over and ball count
      if (isValidBall) {
        currentInnings.balls += 1;
        currentInnings.currentState.currentBall += 1;
        
        // Check if over is complete
        if (currentInnings.currentState.currentBall >= 6) {
          currentInnings.currentState.currentOver += 1;
          currentInnings.currentState.currentBall = 0;
          currentInnings.overs = this.calculateOvers(currentInnings.balls);
          
          // Update bowler rotation
          match.bowlerRotation.lastBowler = new mongoose.Types.ObjectId(ballData.bowlerId);
        }
      }

      // Update batsman stats
      const batsmanStats = currentInnings.battingStats.find(
        stat => stat.player.toString() === ballData.batsmanId
      );
      
      if (batsmanStats) {
        batsmanStats.runs += ballData.runs;
        if (isValidBall) batsmanStats.balls += 1;
        if (ballData.runs === 4) batsmanStats.fours += 1;
        if (ballData.runs === 6) batsmanStats.sixes += 1;
        batsmanStats.strikeRate = batsmanStats.balls > 0 ? 
          (batsmanStats.runs / batsmanStats.balls) * 100 : 0;

        // Handle wicket
        if (ballData.isWicket) {
          batsmanStats.isOut = true;
          batsmanStats.howOut = ballData.dismissalType;
          batsmanStats.dismissedBy = ballData.bowlerId ? 
            new mongoose.Types.ObjectId(ballData.bowlerId) : undefined;
          currentInnings.wickets += 1;
        }
      }

      // Update bowler stats
      let bowlerStats = currentInnings.bowlingStats.find(
        stat => stat.player.toString() === ballData.bowlerId
      );

      if (!bowlerStats) {
        // Create new bowler stats if not exists
        bowlerStats = {
          player: new mongoose.Types.ObjectId(ballData.bowlerId),
          overs: 0,
          balls: 0,
          runs: 0,
          wickets: 0,
          wides: 0,
          noBalls: 0,
          economy: 0
        };
        currentInnings.bowlingStats.push(bowlerStats);
      }

      bowlerStats.runs += ballData.runs;
      if (isValidBall) {
        bowlerStats.balls += 1;
        bowlerStats.overs = this.calculateOvers(bowlerStats.balls);
      }
      
      if (ballData.isWicket) bowlerStats.wickets += 1;

      // Handle extras
      if (ballData.extras) {
        const extraRuns = ballData.extras.runs;
        currentInnings.extras[ballData.extras.type + 's' as keyof typeof currentInnings.extras] += extraRuns;
        currentInnings.extras.total += extraRuns;
        currentInnings.totalRuns += extraRuns;

        if (ballData.extras.type === 'wide') bowlerStats.wides += 1;
        if (ballData.extras.type === 'no-ball') bowlerStats.noBalls += 1;
      }

      // Update total runs
      currentInnings.totalRuns += ballData.runs;

      // Calculate economy rate
      if (bowlerStats.balls > 0) {
        const oversCompleted = bowlerStats.balls / 6;
        bowlerStats.economy = oversCompleted > 0 ? bowlerStats.runs / oversCompleted : 0;
      }

      // Calculate run rate
      if (currentInnings.balls > 0) {
        const oversCompleted = currentInnings.balls / 6;
        currentInnings.runRate = oversCompleted > 0 ? currentInnings.totalRuns / oversCompleted : 0;
      }

      // Handle strike rotation for odd runs
      if (ballData.runs % 2 === 1 && !ballData.isWicket) {
        const onStrike = currentInnings.currentState.onStrikeBatsman;
        const offStrike = currentInnings.currentState.offStrikeBatsman;
        
        currentInnings.currentState.onStrikeBatsman = offStrike;
        currentInnings.currentState.offStrikeBatsman = onStrike;

        // Update strike status in batting stats
        currentInnings.battingStats.forEach(stat => {
          if (stat.player.toString() === onStrike.toString()) {
            stat.isOnStrike = false;
          } else if (stat.player.toString() === offStrike.toString()) {
            stat.isOnStrike = true;
          }
        });
      }

      // Save ball to Over collection for detailed tracking
      const currentOverDoc = await Over.findOne({
        matchId: ballData.matchId,
        inningNumber: match.currentInnings + 1,
        overNumber: currentInnings.currentState.currentOver
      }).session(session);

      const ballRecord: IBall = {
        ballNumber: currentInnings.currentState.currentBall + 1,
        batsmanId: new mongoose.Types.ObjectId(ballData.batsmanId),
        runs: ballData.runs,
        extras: ballData.extras,
        isWicket: ballData.isWicket,
        dismissalType: ballData.dismissalType,
        dismissedPlayerId: ballData.dismissedPlayerId ? 
          new mongoose.Types.ObjectId(ballData.dismissedPlayerId) : undefined,
        fielderId: ballData.fielderId ? 
          new mongoose.Types.ObjectId(ballData.fielderId) : undefined
      };

      if (currentOverDoc) {
        currentOverDoc.balls.push(ballRecord);
        currentOverDoc.overTotal += ballData.runs + (ballData.extras?.runs || 0);
        if (ballData.isWicket) currentOverDoc.wickets += 1;
        await currentOverDoc.save({ session });
      } else {
        // Create new over document
        const newOver = new Over({
          matchId: ballData.matchId,
          inningNumber: match.currentInnings + 1,
          overNumber: currentInnings.currentState.currentOver,
          bowlerId: ballData.bowlerId,
          balls: [ballRecord],
          overTotal: ballData.runs + (ballData.extras?.runs || 0),
          wickets: ballData.isWicket ? 1 : 0
        });
        await newOver.save({ session });
      }

      // Update current state
      currentInnings.currentState.lastBallRuns = ballData.runs;
      currentInnings.currentState.lastBallExtras = ballData.extras?.type;

      // Save match
      await match.save({ session });

      await session.commitTransaction();
      
      // Return populated match
      return await Match.findById(ballData.matchId)
        .populate('team1 team2')
        .populate('innings.battingStats.player')
        .populate('innings.bowlingStats.player')
        .populate('innings.currentState.onStrikeBatsman')
        .populate('innings.currentState.offStrikeBatsman')
        .populate('innings.currentState.currentBowler') as IMatch;

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Start a new over with bowler validation
   */
  static async startNewOver(matchId: string, bowlerId: string): Promise<IMatch> {
    try {
      // Validate bowler rotation
      const rotationResult = await this.getBowlerRotation(matchId);
      
      if (!rotationResult.canBowl) {
        throw new Error(rotationResult.reason || 'Cannot start new over');
      }

      if (!rotationResult.availableBowlers.includes(bowlerId)) {
        throw new Error('Selected bowler is not available for this over');
      }

      const match = await Match.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      const currentInnings = match.innings[match.currentInnings];
      currentInnings.currentState.currentBowler = new mongoose.Types.ObjectId(bowlerId);
      currentInnings.currentState.currentBall = 0;

      await match.save();
      
      return match;
    } catch (error) {
      console.error('Error starting new over:', error);
      throw error;
    }
  }
}