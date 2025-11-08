import mongoose from 'mongoose';
import { Player } from '../models/player.model';
import { Team } from '../models/team.model';
import { Match } from '../models/match.model';
import connectDB from '../config/database';

async function assign() {
  try {
    await connectDB();
    const admin = await Player.findOne({ username: 'admin' });
    if (!admin) {
      console.error('Admin user not found. Run createAdminUser.ts first.');
      return;
    }
    console.log('Admin id:', admin._id.toString());

  const teamResult = await Team.updateMany({ createdBy: { $exists: false } }, { $set: { createdBy: admin._id } });
  // For mongoose v6+, the result has modifiedCount
  // @ts-ignore
  console.log(`Updated ${teamResult.modifiedCount ?? 0} teams`);

  const playerResult = await Player.updateMany({ createdBy: { $exists: false } }, { $set: { createdBy: admin._id } });
  // @ts-ignore
  console.log(`Updated ${playerResult.modifiedCount ?? 0} players`);

  const matchResult = await Match.updateMany({ createdBy: { $exists: false } }, { $set: { createdBy: admin._id } });
  // @ts-ignore
  console.log(`Updated ${matchResult.modifiedCount ?? 0} matches`);

  } catch (err) {
    console.error('Error assigning createdBy:', err);
  } finally {
    await mongoose.connection.close();
  }
}

assign();
