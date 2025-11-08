import mongoose from 'mongoose';

export interface ITeam {
  name: string;
  captain?: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  logo?: string;
  createdBy?: mongoose.Types.ObjectId;
}

const teamSchema = new mongoose.Schema<ITeam>({
  name: {
    type: String,
    required: true,
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
  ,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: false
  }
}, {
  timestamps: true
});

// Ensure uniqueness of team name per creator (allow same name across different users)
teamSchema.index({ name: 1, createdBy: 1 }, { unique: true, partialFilterExpression: { createdBy: { $exists: true } } });

export const Team = mongoose.model<ITeam>('Team', teamSchema);