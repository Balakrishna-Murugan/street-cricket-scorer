import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use the same connection string as the main server
const MONGODB_URI = 'mongodb+srv://RootUser:Root@cluster0.rvecbsg.mongodb.net/street_cricket';

const playersData = [
  // India Players
  {
    name: 'Virat Kohli',
    age: 35,
    role: 'Batsman',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm medium',
    teamName: 'India',
    jerseyNumber: 18,
    stats: {
      matchesPlayed: 274,
      runs: 12898,
      wickets: 4,
      average: 57.32,
      strikeRate: 93.17
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Rohit Sharma',
    age: 37,
    role: 'Batsman',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm off break',
    teamName: 'India',
    jerseyNumber: 45,
    stats: {
      matchesPlayed: 243,
      runs: 9825,
      wickets: 8,
      average: 48.27,
      strikeRate: 88.90
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Jasprit Bumrah',
    age: 30,
    role: 'Bowler',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm fast',
    teamName: 'India',
    jerseyNumber: 93,
    stats: {
      matchesPlayed: 72,
      runs: 99,
      wickets: 121,
      average: 24.43,
      strikeRate: 61.22
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Hardik Pandya',
    age: 31,
    role: 'All-rounder',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm fast medium',
    teamName: 'India',
    jerseyNumber: 33,
    stats: {
      matchesPlayed: 74,
      runs: 1386,
      wickets: 42,
      average: 33.33,
      strikeRate: 113.91
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'KL Rahul',
    age: 32,
    role: 'Wicket-keeper',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm medium',
    teamName: 'India',
    jerseyNumber: 1,
    stats: {
      matchesPlayed: 69,
      runs: 2556,
      wickets: 0,
      average: 47.33,
      strikeRate: 84.93
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Australia Players
  {
    name: 'Steve Smith',
    age: 35,
    role: 'Batsman',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm leg break',
    teamName: 'Australia',
    jerseyNumber: 49,
    stats: {
      matchesPlayed: 155,
      runs: 4378,
      wickets: 17,
      average: 43.34,
      strikeRate: 87.86
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'David Warner',
    age: 38,
    role: 'Batsman',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Right-arm leg break',
    teamName: 'Australia',
    jerseyNumber: 31,
    stats: {
      matchesPlayed: 161,
      runs: 6007,
      wickets: 1,
      average: 44.11,
      strikeRate: 95.08
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Pat Cummins',
    age: 31,
    role: 'Bowler',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm fast',
    teamName: 'Australia',
    jerseyNumber: 30,
    stats: {
      matchesPlayed: 95,
      runs: 617,
      wickets: 171,
      average: 28.36,
      strikeRate: 33.17
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Glenn Maxwell',
    age: 36,
    role: 'All-rounder',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm off break',
    teamName: 'Australia',
    jerseyNumber: 32,
    stats: {
      matchesPlayed: 137,
      runs: 3450,
      wickets: 58,
      average: 33.17,
      strikeRate: 124.84
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Alex Carey',
    age: 33,
    role: 'Wicket-keeper',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Right-arm medium',
    teamName: 'Australia',
    jerseyNumber: 15,
    stats: {
      matchesPlayed: 58,
      runs: 1428,
      wickets: 0,
      average: 30.17,
      strikeRate: 87.52
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // England Players
  {
    name: 'Joe Root',
    age: 34,
    role: 'Batsman',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm off break',
    teamName: 'England',
    jerseyNumber: 66,
    stats: {
      matchesPlayed: 171,
      runs: 6109,
      wickets: 32,
      average: 47.30,
      strikeRate: 86.55
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Jos Buttler',
    age: 34,
    role: 'Wicket-keeper',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm medium',
    teamName: 'England',
    jerseyNumber: 63,
    stats: {
      matchesPlayed: 162,
      runs: 4120,
      wickets: 0,
      average: 40.78,
      strikeRate: 118.42
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Jofra Archer',
    age: 30,
    role: 'Bowler',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm fast',
    teamName: 'England',
    jerseyNumber: 22,
    stats: {
      matchesPlayed: 17,
      runs: 72,
      wickets: 30,
      average: 23.05,
      strikeRate: 33.1
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Ben Stokes',
    age: 33,
    role: 'All-rounder',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Right-arm fast medium',
    teamName: 'England',
    jerseyNumber: 55,
    stats: {
      matchesPlayed: 113,
      runs: 2924,
      wickets: 74,
      average: 39.07,
      strikeRate: 93.55
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Harry Brook',
    age: 25,
    role: 'Batsman',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm medium',
    teamName: 'England',
    jerseyNumber: 62,
    stats: {
      matchesPlayed: 31,
      runs: 1438,
      wickets: 0,
      average: 53.26,
      strikeRate: 97.29
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // South Africa Players
  {
    name: 'Quinton de Kock',
    age: 32,
    role: 'Wicket-keeper',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Right-arm medium',
    teamName: 'South Africa',
    jerseyNumber: 21,
    stats: {
      matchesPlayed: 143,
      runs: 5422,
      wickets: 0,
      average: 44.95,
      strikeRate: 95.34
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Temba Bavuma',
    age: 34,
    role: 'Batsman',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm medium',
    teamName: 'South Africa',
    jerseyNumber: 9,
    stats: {
      matchesPlayed: 52,
      runs: 1277,
      wickets: 0,
      average: 31.17,
      strikeRate: 81.16
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Kagiso Rabada',
    age: 29,
    role: 'Bowler',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm fast',
    teamName: 'South Africa',
    jerseyNumber: 25,
    stats: {
      matchesPlayed: 98,
      runs: 277,
      wickets: 174,
      average: 28.85,
      strikeRate: 34.29
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Aiden Markram',
    age: 30,
    role: 'All-rounder',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm off break',
    teamName: 'South Africa',
    jerseyNumber: 4,
    stats: {
      matchesPlayed: 65,
      runs: 1913,
      wickets: 20,
      average: 37.02,
      strikeRate: 89.39
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'David Miller',
    age: 35,
    role: 'Batsman',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Right-arm off break',
    teamName: 'South Africa',
    jerseyNumber: 9,
    stats: {
      matchesPlayed: 162,
      runs: 4242,
      wickets: 2,
      average: 40.78,
      strikeRate: 101.91
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // New Zealand Players
  {
    name: 'Kane Williamson',
    age: 34,
    role: 'Batsman',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm off break',
    teamName: 'New Zealand',
    jerseyNumber: 22,
    stats: {
      matchesPlayed: 161,
      runs: 6173,
      wickets: 37,
      average: 47.48,
      strikeRate: 81.17
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Trent Boult',
    age: 35,
    role: 'Bowler',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Left-arm fast medium',
    teamName: 'New Zealand',
    jerseyNumber: 18,
    stats: {
      matchesPlayed: 78,
      runs: 245,
      wickets: 169,
      average: 25.21,
      strikeRate: 28.09
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Devon Conway',
    age: 33,
    role: 'Wicket-keeper',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Right-arm medium',
    teamName: 'New Zealand',
    jerseyNumber: 22,
    stats: {
      matchesPlayed: 45,
      runs: 1467,
      wickets: 0,
      average: 42.21,
      strikeRate: 84.91
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Glenn Phillips',
    age: 28,
    role: 'All-rounder',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm off break',
    teamName: 'New Zealand',
    jerseyNumber: 25,
    stats: {
      matchesPlayed: 41,
      runs: 810,
      wickets: 16,
      average: 25.31,
      strikeRate: 108.57
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Rachin Ravindra',
    age: 25,
    role: 'All-rounder',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Left-arm orthodox',
    teamName: 'New Zealand',
    jerseyNumber: 18,
    stats: {
      matchesPlayed: 18,
      runs: 578,
      wickets: 5,
      average: 34.58,
      strikeRate: 106.81
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Pakistan Players
  {
    name: 'Babar Azam',
    age: 30,
    role: 'Batsman',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm medium',
    teamName: 'Pakistan',
    jerseyNumber: 56,
    stats: {
      matchesPlayed: 122,
      runs: 5729,
      wickets: 0,
      average: 56.72,
      strikeRate: 88.32
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Shaheen Afridi',
    age: 24,
    role: 'Bowler',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Left-arm fast',
    teamName: 'Pakistan',
    jerseyNumber: 10,
    stats: {
      matchesPlayed: 54,
      runs: 154,
      wickets: 103,
      average: 22.64,
      strikeRate: 24.73
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Mohammad Rizwan',
    age: 32,
    role: 'Wicket-keeper',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm medium',
    teamName: 'Pakistan',
    jerseyNumber: 12,
    stats: {
      matchesPlayed: 74,
      runs: 2435,
      wickets: 0,
      average: 42.81,
      strikeRate: 87.89
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Shadab Khan',
    age: 26,
    role: 'All-rounder',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm leg break',
    teamName: 'Pakistan',
    jerseyNumber: 18,
    stats: {
      matchesPlayed: 104,
      runs: 1216,
      wickets: 118,
      average: 18.35,
      strikeRate: 95.89
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Fakhar Zaman',
    age: 34,
    role: 'Batsman',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Right-arm medium',
    teamName: 'Pakistan',
    jerseyNumber: 8,
    stats: {
      matchesPlayed: 76,
      runs: 3278,
      wickets: 0,
      average: 45.25,
      strikeRate: 92.85
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function createPlayersForTeams() {
  let client = null;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    const playersCollection = db.collection('players');
    const teamsCollection = db.collection('teams');
    
    // Get all teams to map team names to IDs
    const teams = await teamsCollection.find({}).toArray();
    const teamMap: { [key: string]: string } = {};
    teams.forEach(team => {
      teamMap[team.name] = team._id.toString();
    });
    
    console.log('Found teams:', Object.keys(teamMap));
    
    // Clear existing players (optional)
    console.log('Clearing existing players...');
    await playersCollection.deleteMany({});
    
    // Add team IDs to players
    const playersWithTeamIds = playersData.map(player => ({
      ...player,
      team: teamMap[player.teamName]
    }));
    
    // Insert players
    console.log('Creating players for all teams...');
    const result = await playersCollection.insertMany(playersWithTeamIds);
    
    console.log(`✅ Successfully created ${result.insertedCount} players across 6 teams:`);
    
    // Group players by team and display
    const playersByTeam: { [key: string]: any[] } = {};
    playersWithTeamIds.forEach(player => {
      if (!playersByTeam[player.teamName]) {
        playersByTeam[player.teamName] = [];
      }
      playersByTeam[player.teamName].push(player);
    });
    
    Object.entries(playersByTeam).forEach(([teamName, players]) => {
      console.log(`\n🏏 ${teamName} (${players.length} players):`);
      players.forEach(player => {
        console.log(`   • ${player.name} (${player.role}) - Jersey #${player.jerseyNumber}`);
      });
    });
    
    // Update teams with player IDs
    console.log('\n🔄 Updating teams with player references...');
    for (const [teamName, teamId] of Object.entries(teamMap)) {
      const teamPlayers = await playersCollection.find({ team: teamId }).toArray();
      const playerIds = teamPlayers.map(player => player._id);
      
      await teamsCollection.updateOne(
        { _id: new ObjectId(teamId) },
        { $set: { players: playerIds } }
      );
      console.log(`   Updated ${teamName} with ${playerIds.length} players`);
    }
    
  } catch (error) {
    console.error('❌ Error creating players:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔐 Database connection closed.');
    }
  }
}

// Run the script
createPlayersForTeams();