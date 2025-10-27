import mongoose from 'mongoose';
import { Match } from '../models/match.model';
import connectDB from '../config/database';

async function clearAllMatches() {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('Clearing all matches...');
    const result = await Match.deleteMany({});

    console.log(`Successfully deleted ${result.deletedCount} matches`);

    // Also clear any related data in localStorage (though this is client-side)
    console.log('Note: Remember to clear localStorage data on the client side:');
    console.log('- matchBackup');
    console.log('- currentOverBalls');

  } catch (error) {
    console.error('Error clearing matches:', error);
  } finally {
    await mongoose.connection.close();
  }
}

clearAllMatches();