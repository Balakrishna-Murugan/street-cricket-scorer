import mongoose from 'mongoose';
import { Player } from '../models/player.model';
import { Team } from '../models/team.model';
import { Match } from '../models/match.model';
import connectDB from '../config/database';

async function reassign() {
  try {
    await connectDB();
    const admin = await Player.findOne({ username: 'admin' });
    const hema = await Player.findOne({ username: 'hema' });
    if (!admin) {
      console.error('Admin user not found. Run createAdminUser.ts first.');
      return;
    }
    if (!hema) {
      console.error('Hema user not found.');
      return;
    }
    console.log('Admin id:', admin._id.toString());
    console.log('Hema id:', hema._id.toString());

    const playerResult = await Player.updateMany({ createdBy: hema._id }, { $set: { createdBy: admin._id } });
    // @ts-ignore
    console.log(`Players reassigned: ${playerResult.modifiedCount ?? 0}`);

    const teamResult = await Team.updateMany({ createdBy: hema._id }, { $set: { createdBy: admin._id } });
    // @ts-ignore
    console.log(`Teams reassigned: ${teamResult.modifiedCount ?? 0}`);

    const matchResult = await Match.updateMany({ createdBy: hema._id }, { $set: { createdBy: admin._id } });
    // @ts-ignore
    console.log(`Matches reassigned: ${matchResult.modifiedCount ?? 0}`);

  } catch (err) {
    console.error('Error reassigning ownership:', err);
  } finally {
    await mongoose.connection.close();
  }
}

reassign();
