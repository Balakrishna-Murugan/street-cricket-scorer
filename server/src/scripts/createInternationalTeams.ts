import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use the same connection string as the main server
const MONGODB_URI = 'mongodb+srv://RootUser:Root@cluster0.rvecbsg.mongodb.net/street_cricket';

const internationalTeams = [
  {
    name: 'India',
    description: 'The Indian National Cricket Team - Men in Blue',
    captain: 'Rohit Sharma',
    coach: 'Rahul Dravid',
    homeGround: 'Wankhede Stadium, Mumbai',
    foundedYear: 1932,
    ranking: 1,
    players: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Australia',
    description: 'The Australian National Cricket Team - Baggy Greens',
    captain: 'Pat Cummins',
    coach: 'Andrew McDonald',
    homeGround: 'Melbourne Cricket Ground (MCG)',
    foundedYear: 1877,
    ranking: 2,
    players: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'England',
    description: 'The England Cricket Team - Three Lions',
    captain: 'Jos Buttler',
    coach: 'Brendon McCullum',
    homeGround: 'Lord\'s Cricket Ground, London',
    foundedYear: 1877,
    ranking: 3,
    players: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'South Africa',
    description: 'The South African National Cricket Team - Proteas',
    captain: 'Temba Bavuma',
    coach: 'Rob Walter',
    homeGround: 'Newlands Cricket Ground, Cape Town',
    foundedYear: 1889,
    ranking: 4,
    players: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'New Zealand',
    description: 'The New Zealand National Cricket Team - Black Caps',
    captain: 'Kane Williamson',
    coach: 'Gary Stead',
    homeGround: 'Eden Park, Auckland',
    foundedYear: 1930,
    ranking: 5,
    players: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Pakistan',
    description: 'The Pakistan National Cricket Team - Green Shirts',
    captain: 'Babar Azam',
    coach: 'Mohammad Hafeez',
    homeGround: 'Gaddafi Stadium, Lahore',
    foundedYear: 1952,
    ranking: 6,
    players: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function createInternationalTeams() {
  let client: MongoClient | null = null;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    const teamsCollection = db.collection('teams');
    
    // Clear existing teams (optional - comment out if you want to keep existing teams)
    console.log('Clearing existing teams...');
    await teamsCollection.deleteMany({});
    
    // Insert international teams
    console.log('Creating international teams...');
    const result = await teamsCollection.insertMany(internationalTeams);
    
    console.log(`✅ Successfully created ${result.insertedCount} international teams:`);
    internationalTeams.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.name} (Captain: ${team.captain})`);
    });
    
    // Display team IDs for reference
    console.log('\n📋 Team IDs for reference:');
    const createdTeams = await teamsCollection.find({}).toArray();
    createdTeams.forEach(team => {
      console.log(`   ${team.name}: ${team._id}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating international teams:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔐 Database connection closed.');
    }
  }
}

// Run the script
createInternationalTeams();