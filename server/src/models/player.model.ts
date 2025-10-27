import mongoose from 'mongoose';

export interface IPlayer {
  name: string;
  age: number;
  role: 'batsman' | 'bowler' | 'all-rounder';
  battingStyle?: 'right-handed' | 'left-handed';
  bowlingStyle?: string;
  teams?: mongoose.Types.ObjectId[];
  // Authentication fields
  username?: string;
  password?: string;
  email?: string;
  isGuest?: boolean;
  userRole?: 'player' | 'admin' | 'superadmin' | 'viewer';
  // Guest limitations
  guestLimitations?: {
    maxMatches: number;
    basicScoringOnly: boolean;
    expiresAt: Date;
  };
}

const playerSchema = new mongoose.Schema<IPlayer>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['batsman', 'bowler', 'all-rounder']
  },
  battingStyle: {
    type: String,
    enum: ['right-handed', 'left-handed']
  },
  bowlingStyle: {
    type: String
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  // Authentication fields
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    select: false // Don't include in queries by default
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  userRole: {
    type: String,
    enum: ['player', 'admin', 'superadmin', 'viewer'],
    default: 'player'
  },
  // Guest limitations
  guestLimitations: {
    maxMatches: { type: Number, default: null },
    basicScoringOnly: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null }
  }
}, {
  timestamps: true
});

export const Player = mongoose.model<IPlayer>('Player', playerSchema);