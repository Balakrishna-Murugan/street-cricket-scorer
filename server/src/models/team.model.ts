import mongoose from 'mongoose';

export interface ITeam {
  name: string;
  captain?: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  logo?: string;
}

const teamSchema = new mongoose.Schema<ITeam>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  captain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: false
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  logo: {
    type: String
  }
}, {
  timestamps: true
});

export const Team = mongoose.model<ITeam>('Team', teamSchema);