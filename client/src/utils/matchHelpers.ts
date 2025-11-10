import { Match, BallOutcome, Player } from '../types';

export const cleanMatchData = (match: Match): Match => {
  return {
    ...match,
    team1: typeof match.team1 === 'object' ? (match.team1 as any)._id : match.team1,
    team2: typeof match.team2 === 'object' ? (match.team2 as any)._id : match.team2,
    currentInnings: match.currentInnings || 0,
    matchSettings: match.matchSettings || {
      oversPerBowler: 4,
      maxPlayersPerTeam: 11
    },
    bowlerRotation: match.bowlerRotation || {
      bowlerOversCount: {},
      availableBowlers: []
    },
    innings: match.innings.map(inning => ({
      battingTeam: typeof inning.battingTeam === 'object' ? (inning.battingTeam as any)._id : inning.battingTeam,
      bowlingTeam: typeof inning.bowlingTeam === 'object' ? (inning.bowlingTeam as any)._id : inning.bowlingTeam,
      totalRuns: inning.totalRuns,
      wickets: inning.wickets,
      overs: inning.overs,
      balls: inning.balls || 0,
      isCompleted: inning.isCompleted || false,
      battingStats: (inning.battingStats || []).map(stat => ({
        player: typeof stat.player === 'object' ? (stat.player as any)._id : stat.player,
        runs: stat.runs,
        balls: stat.balls,
        fours: stat.fours,
        sixes: stat.sixes,
        isOut: stat.isOut,
        dismissalType: stat.dismissalType,
        howOut: stat.howOut,
        dismissedBy: stat.dismissedBy,
        strikeRate: stat.strikeRate || 0,
        isOnStrike: stat.isOnStrike || false
      })),
      bowlingStats: (inning.bowlingStats || []).map(stat => ({
        player: typeof stat.player === 'object' ? (stat.player as any)._id : stat.player,
        overs: stat.overs,
        balls: stat.balls || 0,
        runs: stat.runs,
        wickets: stat.wickets,
        wides: stat.wides || 0,
        noBalls: stat.noBalls || 0,
        economy: stat.economy || 0,
        lastBowledOver: stat.lastBowledOver
      })),
      currentState: inning.currentState || {
        currentOver: 0,
        currentBall: 0,
        lastBallRuns: 0
      },
      extras: {
        ...inning.extras,
        total: inning.extras ? inning.extras.total || 0 : 0
      },
      runRate: inning.runRate || 0,
      requiredRunRate: (inning as any).requiredRunRate,
      currentOverBalls: inning.currentOverBalls || [],
      recentBalls: inning.recentBalls || []
    }))
  };
};

/**
 * Return true if the over represented by overBalls is a maiden (no illegal extras and total runs === 0)
 */
export const isMaidenOver = (overBalls: BallOutcome[] = []): boolean => {
  if (!overBalls || overBalls.length === 0) return false;
  const hasIllegalExtras = overBalls.some(b => b.extras && (b.extras.type === 'wide' || b.extras.type === 'no-ball'));
  const totalRuns = overBalls.reduce((s, b) => s + (b.runs || 0), 0);
  return !hasIllegalExtras && totalRuns === 0;
};

/**
 * Mutates the provided match to mark it completed and set result when second innings ends.
 * Returns true if match ended, false otherwise.
 */
export const checkMatchEnd = (updatedMatch: Match, currentInnings: number): boolean => {
  if (!updatedMatch || !updatedMatch.innings || updatedMatch.innings.length < 2) {
    return false;
  }

  const secondInnings = updatedMatch.innings[1];
  const firstInnings = updatedMatch.innings[0];

  // Only check for match end during second innings
  if (currentInnings !== 1) {
    return false;
  }

  const target = (firstInnings.totalRuns || 0) + 1;
  const currentScore = secondInnings.totalRuns || 0;
  const wicketsLost = secondInnings.wickets || 0;

  // Check if team has reached target
  if (currentScore >= target) {
    const wicketsRemaining = 10 - wicketsLost;
    updatedMatch.status = 'completed';
    updatedMatch.result = `${typeof secondInnings.battingTeam === 'object' && secondInnings.battingTeam ? secondInnings.battingTeam.name : 'Team 2'} won by ${wicketsRemaining} wickets`;
    secondInnings.isCompleted = true;
    return true;
  }

  // Check if team lost all 10 wickets
  if (wicketsLost >= 10) {
    const runsDifference = (firstInnings.totalRuns || 0) - currentScore;
    updatedMatch.status = 'completed';
    updatedMatch.result = `${typeof firstInnings.battingTeam === 'object' && firstInnings.battingTeam ? firstInnings.battingTeam.name : 'Team 1'} won by ${runsDifference} runs`;
    secondInnings.isCompleted = true;
    return true;
  }

  return false;
};

/**
 * Returns the list of available batsmen for the current inning (players belonging to batting team and not out)
 */
export const getAvailableBatsmen = (match: Match | null, players: Player[] = [], currentInnings: number): Player[] => {
  if (!match || !players || players.length === 0) return [];
  const currentInning = match.innings[currentInnings];
  if (!currentInning) return [];
  const battingTeamId = typeof currentInning?.battingTeam === 'string'
    ? currentInning.battingTeam
    : (currentInning?.battingTeam as any)?._id;
  if (!battingTeamId) return [];

  return players.filter(player => {
    if (!player.teams || !Array.isArray(player.teams)) return false;
    const hasTeam = player.teams.some(team => {
      const teamId = typeof team === 'string' ? team : (team as any)._id;
      return teamId === String(battingTeamId);
    });
    if (!hasTeam) return false;

    const playerBattingStats = currentInning.battingStats && Array.isArray(currentInning.battingStats)
      ? currentInning.battingStats.find(stat => {
          const playerId = typeof stat.player === 'string' ? stat.player : (stat.player as any)._id;
          return playerId === player._id;
        })
      : null;

    if (!playerBattingStats) return true;
    return !playerBattingStats.isOut;
  });
};

/**
 * Count legal deliveries in an over (exclude wides and no-balls)
 */
export const countLegalDeliveries = (overBalls: BallOutcome[] = []): number => {
  if (!overBalls || overBalls.length === 0) return 0;
  return overBalls.filter(b => !b.extras || (b.extras.type !== 'wide' && b.extras.type !== 'no-ball')).length;
};

/**
 * Recalculate balls and overs after restoring from an undo snapshot.
 * Returns { balls, overs, remainingBalls }
 */
export const recalcBallsFromPreviousState = (previousState: { balls?: number; currentOverBalls?: BallOutcome[] } = {}) => {
  const prevBalls = previousState.balls || 0;
  const overBalls = previousState.currentOverBalls || [];
  const legalDeliveries = countLegalDeliveries(overBalls);
  const balls = prevBalls - (overBalls.length - legalDeliveries);
  const totalBalls = balls;
  const completeOvers = Math.floor(totalBalls / 6);
  const remainingBalls = totalBalls % 6;
  const overs = completeOvers + (remainingBalls / 10);
  return { balls: totalBalls, overs, remainingBalls };
};

/**
 * Apply an undo snapshot (previousState) to the provided match for the given innings.
 * This mutates the passed match object and returns local state values useful for UI updates.
 */
export const applyUndoSnapshot = (match: Match, previousState: any, currentInnings: number) => {
  if (!match || !match.innings || !match.innings[currentInnings]) return null;
  const inning = match.innings[currentInnings];

  // Restore simple inning-level values
  inning.totalRuns = previousState.totalRuns;
  inning.wickets = previousState.wickets;
  inning.currentOverBalls = previousState.currentOverBalls || [];
  inning.extras = previousState.extras || inning.extras || { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };

  // Recalculate balls/overs
  const recalc = recalcBallsFromPreviousState(previousState || {});
  inning.balls = recalc.balls;
  inning.overs = recalc.overs;

  // Restore batting stats for striker/non-striker when present
  if (Array.isArray(inning.battingStats)) {
    inning.battingStats.forEach((stat: any) => {
      const pid = typeof stat.player === 'string' ? stat.player : (stat.player as any)?._id;
      if (pid === previousState.striker) {
        stat.runs = previousState.strikerStats.runs;
        stat.balls = previousState.strikerStats.balls;
        stat.fours = previousState.strikerStats.fours || 0;
        stat.sixes = previousState.strikerStats.sixes || 0;
        stat.isOut = previousState.strikerStats.isOut || false;
        stat.dismissalType = previousState.strikerStats.dismissalType;
        stat.howOut = previousState.strikerStats.howOut;
        stat.dismissedBy = previousState.strikerStats.dismissedBy;
        stat.strikeRate = previousState.strikerStats.strikeRate || 0;
        stat.isOnStrike = true;
      } else if (pid === previousState.nonStriker) {
        stat.runs = previousState.nonStrikerStats.runs;
        stat.balls = previousState.nonStrikerStats.balls;
        stat.fours = previousState.nonStrikerStats.fours || 0;
        stat.sixes = previousState.nonStrikerStats.sixes || 0;
        stat.isOut = previousState.nonStrikerStats.isOut || false;
        stat.dismissalType = previousState.nonStrikerStats.dismissalType;
        stat.howOut = previousState.nonStrikerStats.howOut;
        stat.dismissedBy = previousState.nonStrikerStats.dismissedBy;
        stat.strikeRate = previousState.nonStrikerStats.strikeRate || 0;
        stat.isOnStrike = false;
      }
    });
  }

  // Restore bowling stats for the bowler
  if (Array.isArray(inning.bowlingStats)) {
    inning.bowlingStats.forEach((stat: any) => {
      const pid = typeof stat.player === 'string' ? stat.player : (stat.player as any)?._id;
      if (pid === previousState.bowler) {
        stat.overs = previousState.bowlerStats.overs;
        stat.runs = previousState.bowlerStats.runs;
        stat.wickets = previousState.bowlerStats.wickets;
        stat.balls = previousState.bowlerStats.balls;
      }
    });
  }

  // Return local UI state that LiveScoring will set
  return {
    currentOverBalls: inning.currentOverBalls,
    striker: previousState.striker,
    nonStriker: previousState.nonStriker,
    bowler: previousState.bowler,
    strikerStats: previousState.strikerStats,
    nonStrikerStats: previousState.nonStrikerStats,
    bowlerStats: previousState.bowlerStats
  };
};

/**
 * Create a snapshot object suitable for storing in undo history.
 * Accepts the current inning object and optional local stats to capture.
 */
export const createUndoSnapshot = (currentInning: any, opts: {
  striker?: string;
  nonStriker?: string;
  bowler?: string;
  strikerStats?: any;
  nonStrikerStats?: any;
  bowlerStats?: any;
} = {}) => {
  return {
    totalRuns: currentInning.totalRuns,
    wickets: currentInning.wickets,
    balls: currentInning.balls || 0,
    overs: currentInning.overs,
    currentOverBalls: Array.isArray(currentInning.currentOverBalls) ? [...currentInning.currentOverBalls] : [],
    extras: { ...(currentInning.extras || { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 }) },
    striker: opts.striker,
    nonStriker: opts.nonStriker,
    bowler: opts.bowler,
    strikerStats: opts.strikerStats || { runs: 0, balls: 0 },
    nonStrikerStats: opts.nonStrikerStats || { runs: 0, balls: 0 },
    bowlerStats: opts.bowlerStats || { overs: 0, runs: 0, wickets: 0, balls: 0 }
  };
};

/**
 * Create a full UndoAction object (id, type, timestamp, data, matchState)
 */
export const createUndoAction = (
  actionType: 'ball_outcome' | 'wicket' | 'extra' | 'player_change',
  data: any,
  currentInning: any,
  opts: { striker?: string; nonStriker?: string; bowler?: string; strikerStats?: any; nonStrikerStats?: any; bowlerStats?: any } = {}
) => {
  const snapshot = createUndoSnapshot(currentInning, opts);
  return {
    id: `${actionType}_${Date.now()}`,
    type: actionType,
    timestamp: Date.now(),
    data,
    matchState: snapshot
  };
};
