import mongoose from 'mongoose';

interface IBattingStats {
  player: mongoose.Types.ObjectId;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  howOut?: string;
  dismissedBy?: mongoose.Types.ObjectId; // Bowler who took the wicket
  strikeRate: number; // Calculated field
  isOnStrike: boolean; // Current strike status
}

interface IBowlingStats {
  player: mongoose.Types.ObjectId;
  overs: number; // Will store as complete overs (e.g., 3.4 = 3 overs 4 balls)
  balls: number; // Total balls bowled (for accurate calculation)
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
  economy: number; // Calculated field
  lastBowledOver?: number; // Track when they last bowled
}

interface ICurrentState {
  currentOver: number;
  currentBall: number; // 0-5 for 6-ball overs
  onStrikeBatsman: mongoose.Types.ObjectId;
  offStrikeBatsman: mongoose.Types.ObjectId;
  currentBowler: mongoose.Types.ObjectId;
  lastBallRuns: number;
  lastBallExtras?: string;
}

interface IBallOutcome {
  ballNumber: number;
  runs: number;
  extras?: {
    type: 'wide' | 'no-ball' | 'bye' | 'leg-bye';
    runs: number;
  };
  isWicket: boolean;
  dismissalType?: 'bowled' | 'caught' | 'run out' | 'stumped' | 'lbw' | 'hit wicket';
  fielder?: string;
  timestamp?: number;
  sequenceNumber?: number;
}

interface IInnings {
  battingTeam: mongoose.Types.ObjectId;
  bowlingTeam: mongoose.Types.ObjectId;
  totalRuns: number;
  wickets: number;
  overs: number;
  balls: number; // Total balls bowled in this innings
  isCompleted: boolean;
  battingStats: IBattingStats[];
  bowlingStats: IBowlingStats[];
  currentState: ICurrentState;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    total: number;
  };
  runRate: number; // Current run rate
  requiredRunRate?: number; // For second innings
  currentOverBalls?: IBallOutcome[]; // Store current over's ball-by-ball data
  recentBalls?: IBallOutcome[]; // Store last 12 balls for live commentary
}

const inningsSchema = new mongoose.Schema<IInnings>({
  battingTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  bowlingTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  totalRuns: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  overs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  battingStats: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    isOut: { type: Boolean, default: false },
    howOut: String,
    dismissedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    strikeRate: { type: Number, default: 0 },
    isOnStrike: { type: Boolean, default: false }
  }],
  bowlingStats: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
    lastBowledOver: Number
  }],
  currentState: {
    currentOver: { type: Number, default: 0 },
    currentBall: { type: Number, default: 0 },
    onStrikeBatsman: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    offStrikeBatsman: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    currentBowler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    lastBallRuns: { type: Number, default: 0 },
    lastBallExtras: String
  },
  extras: {
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    byes: { type: Number, default: 0 },
    legByes: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  runRate: { type: Number, default: 0 },
  requiredRunRate: Number,
  currentOverBalls: [{
    ballNumber: { type: Number, required: true },
    runs: { type: Number, required: true },
    extras: {
      type: {
        type: String,
        enum: ['wide', 'no-ball', 'bye', 'leg-bye']
      },
      runs: { type: Number }
    },
    isWicket: { type: Boolean, required: true },
    dismissalType: {
      type: String,
      enum: ['bowled', 'caught', 'run out', 'stumped', 'lbw', 'hit wicket']
    },
    fielder: String,
    timestamp: Number,
    sequenceNumber: Number
  }],
  recentBalls: [{
    ballNumber: { type: Number, required: true },
    runs: { type: Number, required: true },
    extras: {
      type: {
        type: String,
        enum: ['wide', 'no-ball', 'bye', 'leg-bye']
      },
      runs: { type: Number }
    },
    isWicket: { type: Boolean, required: true },
    dismissalType: {
      type: String,
      enum: ['bowled', 'caught', 'run out', 'stumped', 'lbw', 'hit wicket']
    },
    fielder: String,
    timestamp: Number,
    sequenceNumber: Number
  }]
});

export interface IMatch {
  team1: mongoose.Types.ObjectId;
  team2: mongoose.Types.ObjectId;
  date: Date;
  venue?: string;
  overs: number;
  status: 'upcoming' | 'in-progress' | 'completed' | 'abandoned';
  result?: string;
  innings: IInnings[];
  tossWinner?: mongoose.Types.ObjectId;
  tossDecision?: 'bat' | 'bowl';
  currentInnings: number; // 0 or 1 for first or second innings
  matchSettings: {
    oversPerBowler: number; // Max overs per bowler (e.g., 20% of total overs)
    powerplayOvers?: number;
    maxPlayersPerTeam: number;
  };
  bowlerRotation: {
    lastBowler?: mongoose.Types.ObjectId;
    bowlerOversCount: Map<string, number>; // Track overs bowled by each bowler
    availableBowlers: mongoose.Types.ObjectId[]; // Bowlers who can bowl next over
  };
}

const matchSchema = new mongoose.Schema<IMatch>({
  team1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  team2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  venue: String,
  overs: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'in-progress', 'completed', 'abandoned'],
    default: 'upcoming'
  },
  result: String,
  innings: [inningsSchema],
  tossWinner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  tossDecision: {
    type: String,
    enum: ['bat', 'bowl']
  },
  currentInnings: {
    type: Number,
    default: 0
  },
  matchSettings: {
    oversPerBowler: {
      type: Number,
      default: function() {
        // Default to 20% of total overs, minimum 1, maximum 4
        const maxOvers = Math.floor(this.overs * 0.2);
        return Math.max(1, Math.min(4, maxOvers));
      }
    },
    powerplayOvers: Number,
    maxPlayersPerTeam: {
      type: Number,
      default: 11
    }
  },
  bowlerRotation: {
    lastBowler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    bowlerOversCount: {
      type: Map,
      of: Number,
      default: new Map()
    },
    availableBowlers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    }]
  }
}, { timestamps: true });

export const Match = mongoose.model<IMatch>('Match', matchSchema);
