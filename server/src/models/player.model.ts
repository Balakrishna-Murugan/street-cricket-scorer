import mongoose from 'mongoose';

export interface IPlayer {
  name: string;
  age: number;
  role: 'batsman' | 'bowler' | 'all-rounder';
  battingStyle?: 'right-handed' | 'left-handed';
  bowlingStyle?: string;
  teams?: mongoose.Types.ObjectId[];
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
  }]
}, {
  timestamps: true
});

export const Player = mongoose.model<IPlayer>('Player', playerSchema);