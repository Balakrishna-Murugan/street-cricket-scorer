import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use the same connection string as the main server
const MONGODB_URI = 'mongodb+srv://RootUser:Root@cluster0.rvecbsg.mongodb.net/street_cricket';

async function createSampleMatch() {
  let client = null;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    const teamsCollection = db.collection('teams');
    const matchesCollection = db.collection('matches');
    
    // Get India and Australia team IDs
    const indiaTeam = await teamsCollection.findOne({ name: 'India' });
    const australiaTeam = await teamsCollection.findOne({ name: 'Australia' });
    
    if (!indiaTeam || !australiaTeam) {
      console.error('❌ Could not find India or Australia teams');
      return;
    }
    
    console.log('Found teams:');
    console.log(`  India: ${indiaTeam._id}`);
    console.log(`  Australia: ${australiaTeam._id}`);
    
    // Clear existing matches (optional)
    // console.log('Clearing existing matches...');
    // await matchesCollection.deleteMany({});
    
    // Check if this match already exists
    const existingMatch = await matchesCollection.findOne({
      team1: indiaTeam._id,
      team2: australiaTeam._id,
      status: 'upcoming'
    });
    
    if (existingMatch) {
      console.log('⚠️  A match between India and Australia already exists:');
      console.log(`   Match ID: ${existingMatch._id}`);
      console.log('   Use this existing match for testing!');
      return;
    }
    
    // Create sample match
    const sampleMatch = {
      team1: indiaTeam._id,
      team2: australiaTeam._id,
      date: new Date().toISOString(),
      overs: 20,
      status: 'upcoming',
      venue: 'Wankhede Stadium, Mumbai',
      currentInnings: 0,
      tossWinner: indiaTeam._id, // India wins toss
      tossDecision: 'bat', // India chooses to bat first
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
          battingTeam: indiaTeam._id.toString(), // India bats first (toss winner chose to bat)
          bowlingTeam: australiaTeam._id.toString(), // Australia bowls first
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
          battingTeam: australiaTeam._id.toString(), // Australia bats second
          bowlingTeam: indiaTeam._id.toString(), // India bowls second
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
    
    // Insert the match
    const result = await matchesCollection.insertOne(sampleMatch);
    
    console.log('✅ Successfully created sample match:');
    console.log(`   Match ID: ${result.insertedId}`);
    console.log(`   🏏 India vs Australia`);
    console.log(`   📅 Date: ${new Date(sampleMatch.date).toLocaleDateString()}`);
    console.log(`   📍 Venue: ${sampleMatch.venue}`);
    console.log(`   🎯 Overs: ${sampleMatch.overs}`);
    console.log(`   🏆 Toss: India won and chose to bat first`);
    console.log(`   📊 Status: ${sampleMatch.status}`);
    
    console.log('\n🎮 Now you can:');
    console.log('   1. Go to http://localhost:3000/matches');
    console.log('   2. Click "Start Match" on the India vs Australia match');
    console.log('   3. Select striker, non-striker, and bowler from the dropdowns');
    console.log('   4. Start scoring!');
    
  } catch (error) {
    console.error('❌ Error creating sample match:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔐 Database connection closed.');
    }
  }
}

// Run the script
createSampleMatch();