import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use the same connection string as the main server
const MONGODB_URI = 'mongodb+srv://RootUser:Root@cluster0.rvecbsg.mongodb.net/street_cricket';

async function createMultipleSampleMatches() {
  let client = null;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    const teamsCollection = db.collection('teams');
    const matchesCollection = db.collection('matches');
    
    // Get all teams
    const teams = await teamsCollection.find({}).toArray();
    console.log('Found teams:', teams.map(t => t.name).join(', '));
    
    if (teams.length < 2) {
      console.error('❌ Need at least 2 teams to create matches');
      return;
    }
    
    // Create multiple sample matches
    const sampleMatches = [
      {
        team1: teams.find(t => t.name === 'India')?._id,
        team2: teams.find(t => t.name === 'Australia')?._id,
        venue: 'Wankhede Stadium, Mumbai',
        tossWinner: teams.find(t => t.name === 'India')?._id,
        tossDecision: 'bat',
        description: 'India vs Australia - Classic rivalry'
      },
      {
        team1: teams.find(t => t.name === 'England')?._id,
        team2: teams.find(t => t.name === 'South Africa')?._id,
        venue: 'Lord\'s Cricket Ground, London',
        tossWinner: teams.find(t => t.name === 'England')?._id,
        tossDecision: 'bowl',
        description: 'England vs South Africa'
      },
      {
        team1: teams.find(t => t.name === 'New Zealand')?._id,
        team2: teams.find(t => t.name === 'Pakistan')?._id,
        venue: 'Eden Park, Auckland',
        tossWinner: teams.find(t => t.name === 'Pakistan')?._id,
        tossDecision: 'bat',
        description: 'New Zealand vs Pakistan'
      }
    ];
    
    let createdCount = 0;
    
    for (const matchData of sampleMatches) {
      if (!matchData.team1 || !matchData.team2 || !matchData.tossWinner) {
        console.log(`⚠️  Skipping match - teams or toss winner not found`);
        continue;
      }
      
      // Check if this match already exists
      const existingMatch = await matchesCollection.findOne({
        team1: matchData.team1,
        team2: matchData.team2,
        status: 'upcoming'
      });
      
      if (existingMatch) {
        console.log(`⚠️  Match already exists: ${matchData.description}`);
        continue;
      }
      
      const battingTeamId = matchData.tossDecision === 'bat' ? matchData.tossWinner : 
                           (matchData.tossWinner.equals(matchData.team1) ? matchData.team2 : matchData.team1);
      const bowlingTeamId = matchData.tossDecision === 'bowl' ? matchData.tossWinner :
                           (matchData.tossWinner.equals(matchData.team1) ? matchData.team2 : matchData.team1);
      
      const match = {
        team1: matchData.team1,
        team2: matchData.team2,
        date: new Date().toISOString(),
        overs: 20,
        status: 'upcoming',
        venue: matchData.venue,
        currentInnings: 0,
        tossWinner: matchData.tossWinner,
        tossDecision: matchData.tossDecision,
        matchSettings: {
          oversPerBowler: 4,
          maxPlayersPerTeam: 11
        },
        bowlerRotation: {
          bowlerOversCount: {},
          availableBowlers: []
        },
        innings: [
          {
            battingTeam: battingTeamId.toString(),
            bowlingTeam: bowlingTeamId.toString(),
            totalRuns: 0,
            wickets: 0,
            overs: 0,
            balls: 0,
            isCompleted: false,
            battingStats: [],
            bowlingStats: [],
            currentState: {
              currentOver: 0,
              currentBall: 0,
              lastBallRuns: 0
            },
            extras: {
              wides: 0,
              noBalls: 0,
              byes: 0,
              legByes: 0,
              total: 0
            },
            runRate: 0
          },
          {
            battingTeam: bowlingTeamId.toString(),
            bowlingTeam: battingTeamId.toString(),
            totalRuns: 0,
            wickets: 0,
            overs: 0,
            balls: 0,
            isCompleted: false,
            battingStats: [],
            bowlingStats: [],
            currentState: {
              currentOver: 0,
              currentBall: 0,
              lastBallRuns: 0
            },
            extras: {
              wides: 0,
              noBalls: 0,
              byes: 0,
              legByes: 0,
              total: 0
            },
            runRate: 0
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await matchesCollection.insertOne(match);
      createdCount++;
      
      const team1Name = teams.find(t => t._id && matchData.team1 && t._id.equals(matchData.team1))?.name;
      const team2Name = teams.find(t => t._id && matchData.team2 && t._id.equals(matchData.team2))?.name;
      const tossWinnerName = teams.find(t => t._id && matchData.tossWinner && t._id.equals(matchData.tossWinner))?.name;
      
      console.log(`✅ Created: ${team1Name} vs ${team2Name}`);
      console.log(`   🏆 Toss: ${tossWinnerName} won and chose to ${matchData.tossDecision} first`);
      console.log(`   📍 Venue: ${matchData.venue}`);
    }
    
    console.log(`\n🎉 Successfully created ${createdCount} new matches!`);
    console.log('\n🎮 You can now test:');
    console.log('   1. Go to http://localhost:3000/matches');
    console.log('   2. Click "Start Match" on any upcoming match');
    console.log('   3. Test the player dropdowns and scoring features');
    
  } catch (error) {
    console.error('❌ Error creating sample matches:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔐 Database connection closed.');
    }
  }
}

// Run the script
createMultipleSampleMatches();