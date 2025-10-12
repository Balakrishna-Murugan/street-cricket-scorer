// src/types/index.ts

export interface PlayerRef {
  _id: string;
  name: string;
}

export interface TeamRef {
  _id: string;
  name: string;
}

export interface Player {
  _id?: string;
  name: string;
  age: number;
  role: 'batsman' | 'bowler' | 'all-rounder';
  battingStyle?: 'right-handed' | 'left-handed';
  bowlingStyle?: string;
  team?: string | TeamRef; // Single team reference (singular)
  teams?: Array<string | TeamRef>; // Multiple teams reference (plural) - for backwards compatibility
}

export interface Team {
  _id?: string;
  name: string;
  captain?: string | { _id: string; name: string };
  members: Array<string | { _id: string; name: string; role: string }>;
  logo?: string;
}

export interface BallOutcome {
  ballNumber: number;
  runs: number;
  extras?: {
    type: 'wide' | 'no-ball' | 'bye' | 'leg-bye';
    runs: number;
  };
  isWicket: boolean;
  dismissalType?: 'bowled' | 'caught' | 'run out' | 'stumped' | 'lbw' | 'hit wicket';
  fielder?: string;
}

export interface BattingStats {
  player: string | PlayerRef;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissalType?: string;
  howOut?: string;
  dismissedBy?: string | PlayerRef;
  strikeRate: number;
  isOnStrike: boolean;
}

export interface BowlingStats {
  player: string | PlayerRef;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
  economy: number;
  lastBowledOver?: number;
}

export interface CurrentState {
  currentOver: number;
  currentBall: number;
  onStrikeBatsman?: string | PlayerRef;
  offStrikeBatsman?: string | PlayerRef;
  currentBowler?: string | PlayerRef;
  lastBallRuns: number;
  lastBallExtras?: string;
}

export interface Extras {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  total: number;
}

export interface Innings {
  battingTeam: string | TeamRef;
  bowlingTeam: string | TeamRef;
  totalRuns: number;
  wickets: number;
  overs: number;
  balls: number;
  isCompleted: boolean;
  battingStats: BattingStats[];
  bowlingStats: BowlingStats[];
  currentState: CurrentState;
  extras: Extras;
  runRate: number;
  requiredRunRate?: number;
  currentOverBalls?: BallOutcome[]; // Store current over's ball-by-ball data
}

export interface Over {
  _id?: string;
  matchId: string;
  inningNumber: number;
  overNumber: number;
  bowlerId: string;
  balls: BallOutcome[];
  overTotal: number;
  wickets: number;
  timestamp: string;
}

export interface Match {
  _id?: string;
  team1: string | TeamRef;
  team2: string | TeamRef;
  date: string;
  venue?: string;
  overs: number;
  status: 'upcoming' | 'in-progress' | 'completed' | 'abandoned';
  tossWinner?: string | TeamRef;
  tossDecision?: 'bat' | 'bowl';
  result?: string;
  innings: Innings[];
  currentInnings: number;
  matchSettings: {
    oversPerBowler: number;
    powerplayOvers?: number;
    maxPlayersPerTeam: number;
  };
  bowlerRotation: {
    lastBowler?: string | PlayerRef;
    bowlerOversCount: Record<string, number>;
    availableBowlers: Array<string | PlayerRef>;
  };
}

// Ball processing interface for API calls
export interface BallData {
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

// Bowler rotation result from API
export interface BowlerRotationResult {
  availableBowlers: string[];
  recommendedBowler?: string;
  canBowl: boolean;
  reason?: string;
}