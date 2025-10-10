import mongoose from 'mongoose';

export interface IBall {
  ballNumber: number;
  batsmanId: mongoose.Types.ObjectId;
  runs: number;
  extras?: {
    type: 'wide' | 'no-ball' | 'bye' | 'leg-bye';
    runs: number;
  };
  isWicket: boolean;
  dismissalType?: string;
  dismissedPlayerId?: mongoose.Types.ObjectId;
  fielderId?: mongoose.Types.ObjectId;
}

export interface IOver {
  matchId: mongoose.Types.ObjectId;
  inningNumber: number;
  overNumber: number;
  bowlerId: mongoose.Types.ObjectId;
  balls: IBall[];
  overTotal: number;
  wickets: number;
  timestamp: Date;
}

const overSchema = new mongoose.Schema<IOver>({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  inningNumber: {
    type: Number,
    required: true,
    enum: [1, 2]
  },
  overNumber: {
    type: Number,
    required: true
  },
  bowlerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  balls: [{
    ballNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 6
    },
    batsmanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true
    },
    runs: {
      type: Number,
      required: true,
      default: 0
    },
    extras: {
      type: {
        type: String,
        enum: ['wide', 'no-ball', 'bye', 'leg-bye']
      },
      runs: {
        type: Number,
        default: 0
      }
    },
    isWicket: {
      type: Boolean,
      default: false
    },
    dismissalType: {
      type: String,
      enum: ['bowled', 'caught', 'run out', 'stumped', 'lbw', 'hit wicket']
    },
    dismissedPlayerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    fielderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    }
  }],
  overTotal: {
    type: Number,
    required: true,
    default: 0
  },
  wickets: {
    type: Number,
    required: true,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const Over = mongoose.model<IOver>('Over', overSchema);
export default Over;