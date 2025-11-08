import mongoose from 'mongoose';
import { Player } from '../models/player.model';
import connectDB from '../config/database';

async function createSamplePlayers() {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('Creating sample players...');

    const samplePlayers = [
      {
        name: 'Virat Kohli',
        age: 35,
        role: 'batsman' as const,
        battingStyle: 'right-handed' as const,
        bowlingStyle: 'Right-arm medium',
      },
      {
        name: 'Rohit Sharma',
        age: 37,
        role: 'batsman' as const,
        battingStyle: 'right-handed' as const,
        bowlingStyle: 'Right-arm off break',
      },
      {
        name: 'Jasprit Bumrah',
        age: 30,
        role: 'bowler' as const,
        battingStyle: 'right-handed' as const,
        bowlingStyle: 'Right-arm fast',
      },
      {
        name: 'Ravindra Jadeja',
        age: 35,
        role: 'all-rounder' as const,
        battingStyle: 'left-handed' as const,
        bowlingStyle: 'Left-arm orthodox',
      },
      {
        name: 'KL Rahul',
        age: 32,
        role: 'batsman' as const,
        battingStyle: 'right-handed' as const,
        bowlingStyle: 'Right-arm medium',
      },
      {
        name: 'Mohammed Shami',
        age: 34,
        role: 'bowler' as const,
        battingStyle: 'right-handed' as const,
        bowlingStyle: 'Right-arm fast',
      },
      {
        name: 'Hardik Pandya',
        age: 30,
        role: 'all-rounder' as const,
        battingStyle: 'right-handed' as const,
        bowlingStyle: 'Right-arm fast-medium',
      },
      {
        name: 'Rishabh Pant',
        age: 26,
        role: 'batsman' as const,
        battingStyle: 'left-handed' as const,
        bowlingStyle: 'Wicketkeeper',
      },
      {
        name: 'Shikhar Dhawan',
        age: 38,
        role: 'batsman' as const,
        battingStyle: 'left-handed' as const,
        bowlingStyle: 'Right-arm off break',
      },
      {
        name: 'Yuzvendra Chahal',
        age: 33,
        role: 'bowler' as const,
        battingStyle: 'right-handed' as const,
        bowlingStyle: 'Right-arm leg break',
      },
      {
        name: 'Steve Smith',
        age: 34,
        role: 'batsman' as const,
        battingStyle: 'right-handed' as const,
        bowlingStyle: 'Right-arm leg break',
      },
      {
        name: 'David Warner',
        age: 37,
        role: 'batsman' as const,
        battingStyle: 'left-handed' as const,
        bowlingStyle: 'Right-arm leg break',
      },
      {
        name: 'Pat Cummins',
        age: 30,
        role: 'all-rounder' as const,
        battingStyle: 'right-handed' as const,
        bowlingStyle: 'Right-arm fast',
      },
      {
        name: 'Glenn Maxwell',
        age: 35,
        role: 'all-rounder' as const,
        battingStyle: 'right-handed' as const,
        bowlingStyle: 'Right-arm off break',
      },
      {
        name: 'Mitchell Starc',
        age: 34,
        role: 'bowler' as const,
        battingStyle: 'left-handed' as const,
        bowlingStyle: 'Left-arm fast',
      },
    ];

    const createdPlayers = await Player.insertMany(samplePlayers);
    console.log(`Successfully created ${createdPlayers.length} sample players`);

    console.log('Sample players created successfully!');
    console.log('Player IDs:');
    createdPlayers.forEach(player => {
      console.log(`${player.name}: ${player._id}`);
    });

  } catch (error) {
    console.error('Error creating sample players:', error);
  } finally {
    await mongoose.connection.close();
  }
}

createSamplePlayers();