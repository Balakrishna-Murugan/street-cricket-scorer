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
  teams?: Array<string | TeamRef>;
}

export interface Team {
  _id?: string;
  name: string;
  captain: string;
  members: string[];
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
}

export interface BowlingStats {
  player: string | PlayerRef;
  overs: number;
  runs: number;
  wickets: number;
  economy?: number;
  maidens?: number;
}

export interface Extras {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
}

export interface Innings {
  battingTeam: string | TeamRef;
  bowlingTeam: string | TeamRef;
  totalRuns: number;
  wickets: number;
  overs: number;
  battingStats: BattingStats[];
  bowlingStats: BowlingStats[];
  extras: Extras;
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
  status: 'upcoming' | 'in-progress' | 'completed';
  tossWinner?: string;
  tossDecision?: 'bat' | 'bowl';
  result?: string;
  innings: Innings[];
}