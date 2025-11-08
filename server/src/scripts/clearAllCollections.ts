import mongoose from 'mongoose';
import { Match } from '../models/match.model';
import { Player } from '../models/player.model';
import { Team } from '../models/team.model';
import connectDB from '../config/database';

async function clearAllCollections() {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('Clearing all collections...');

    // Clear matches
    const matchResult = await Match.deleteMany({});
    console.log(`Successfully deleted ${matchResult.deletedCount} matches`);

    // Clear players
    const playerResult = await Player.deleteMany({});
    console.log(`Successfully deleted ${playerResult.deletedCount} players`);

    // Clear teams
    const teamResult = await Team.deleteMany({});
    console.log(`Successfully deleted ${teamResult.deletedCount} teams`);

    console.log('All collections cleared successfully!');

    // Also clear any related data in localStorage (though this is client-side)
    console.log('Note: Remember to clear localStorage data on the client side:');
    console.log('- matchBackup');
    console.log('- currentOverBalls');
    console.log('- isAuthenticated');
    console.log('- user');
    console.log('- userRole');
    console.log('- username');

  } catch (error) {
    console.error('Error clearing collections:', error);
  } finally {
    await mongoose.connection.close();
  }
}

clearAllCollections();