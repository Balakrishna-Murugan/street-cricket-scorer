import mongoose from 'mongoose';
import { Team } from '../models/team.model';
import { Player } from '../models/player.model';
import { Match } from '../models/match.model';
import Over from '../models/over.model';
import connectDB from '../config/database';

const createTestData = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Team.deleteMany({});
    await Player.deleteMany({});
    await Match.deleteMany({});
    await Over.deleteMany({});
    console.log('✅ All existing data cleared');

    // Team and player data
    const teamsData = [
      {
        name: 'Mumbai Warriors',
        players: [
          { name: 'Rohit Sharma', role: 'batsman', battingStyle: 'right-handed', bowlingStyle: 'right-arm medium' },
          { name: 'Hardik Pandya', role: 'all-rounder', battingStyle: 'right-handed', bowlingStyle: 'right-arm medium' },
          { name: 'Jasprit Bumrah', role: 'bowler', battingStyle: 'right-handed', bowlingStyle: 'right-arm fast' },
          { name: 'Suryakumar Yadav', role: 'batsman', battingStyle: 'right-handed', bowlingStyle: 'right-arm off-break' },
          { name: 'Ishan Kishan', role: 'batsman', battingStyle: 'left-handed', bowlingStyle: 'right-arm medium' }
        ]
      },
      {
        name: 'Chennai Super Kings',
        players: [
          { name: 'MS Dhoni', role: 'batsman', battingStyle: 'right-handed', bowlingStyle: 'right-arm medium' },
          { name: 'Ravindra Jadeja', role: 'all-rounder', battingStyle: 'left-handed', bowlingStyle: 'left-arm spin' },
          { name: 'Deepak Chahar', role: 'bowler', battingStyle: 'right-handed', bowlingStyle: 'right-arm medium' },
          { name: 'Ruturaj Gaikwad', role: 'batsman', battingStyle: 'right-handed', bowlingStyle: 'right-arm off-break' },
          { name: 'Moeen Ali', role: 'all-rounder', battingStyle: 'left-handed', bowlingStyle: 'right-arm off-break' }
        ]
      },
      {
        name: 'Royal Challengers',
        players: [
          { name: 'Virat Kohli', role: 'batsman', battingStyle: 'right-handed', bowlingStyle: 'right-arm medium' },
          { name: 'AB de Villiers', role: 'batsman', battingStyle: 'right-handed', bowlingStyle: 'right-arm medium' },
          { name: 'Yuzvendra Chahal', role: 'bowler', battingStyle: 'right-handed', bowlingStyle: 'right-arm leg-break' },
          { name: 'Devdutt Padikkal', role: 'batsman', battingStyle: 'left-handed', bowlingStyle: 'right-arm off-break' },
          { name: 'Mohammed Siraj', role: 'bowler', battingStyle: 'right-handed', bowlingStyle: 'right-arm fast' }
        ]
      },
      {
        name: 'Delhi Capitals',
        players: [
          { name: 'Rishabh Pant', role: 'batsman', battingStyle: 'left-handed', bowlingStyle: 'right-arm medium' },
          { name: 'Shreyas Iyer', role: 'batsman', battingStyle: 'right-handed', bowlingStyle: 'right-arm leg-break' },
          { name: 'Kagiso Rabada', role: 'bowler', battingStyle: 'right-handed', bowlingStyle: 'right-arm fast' },
          { name: 'Prithvi Shaw', role: 'batsman', battingStyle: 'right-handed', bowlingStyle: 'right-arm leg-break' },
          { name: 'Axar Patel', role: 'all-rounder', battingStyle: 'left-handed', bowlingStyle: 'left-arm spin' }
        ]
      },
      {
        name: 'Kolkata Knight Riders',
        players: [
          { name: 'Andre Russell', role: 'all-rounder', battingStyle: 'right-handed', bowlingStyle: 'right-arm fast' },
          { name: 'Sunil Narine', role: 'all-rounder', battingStyle: 'left-handed', bowlingStyle: 'right-arm off-break' }
        ]
      },
      {
        name: 'Local Street Team',
        players: [
          { name: 'Rajesh Kumar', role: 'batsman', battingStyle: 'right-handed', bowlingStyle: 'right-arm medium' },
          { name: 'Amit Singh', role: 'bowler', battingStyle: 'left-handed', bowlingStyle: 'left-arm spin' },
          { name: 'Vikram Patel', role: 'all-rounder', battingStyle: 'right-handed', bowlingStyle: 'right-arm medium' }
        ]
      }
    ];

    const createdTeams = [];
    const allPlayers = [];

    console.log('🏏 Creating teams and players...');

    // Create teams and players
    for (const teamData of teamsData) {
      console.log(`Creating team: ${teamData.name}`);
      
      // Create players for this team
      const teamPlayers = [];
      for (const playerData of teamData.players) {
        const player = await Player.create({
          name: playerData.name,
          age: Math.floor(Math.random() * 15) + 20, // Age between 20-35
          role: playerData.role,
          battingStyle: playerData.battingStyle,
          bowlingStyle: playerData.bowlingStyle
        });
        teamPlayers.push(player);
        allPlayers.push(player);
        console.log(`  ✅ Created player: ${player.name}`);
      }

      // Create team with first player as captain
      const team = await Team.create({
        name: teamData.name,
        captain: teamPlayers[0]._id,
        members: teamPlayers.map(p => p._id)
      });

      // Update players to include this team in their teams array
      for (const player of teamPlayers) {
        await Player.findByIdAndUpdate(
          player._id,
          { $push: { teams: team._id } },
          { new: true }
        );
      }

      createdTeams.push(team);
      console.log(`  ✅ Created team: ${team.name} with captain: ${teamPlayers[0].name}`);
    }

    console.log('🏆 Creating sample matches...');

    // Create 4 sample matches including small team matches
    const matches = [
      {
        team1: createdTeams[0]._id,
        team2: createdTeams[1]._id,
        venue: 'Wankhede Stadium',
        date: new Date('2025-10-15'),
        overs: 10,
        status: 'upcoming'
      },
      {
        team1: createdTeams[2]._id,
        team2: createdTeams[3]._id,
        venue: 'Eden Gardens',
        date: new Date('2025-10-16'),
        overs: 10,
        status: 'upcoming'
      },
      {
        team1: createdTeams[4]._id,
        team2: createdTeams[0]._id,
        venue: 'M Chinnaswamy Stadium',
        date: new Date('2025-10-17'),
        overs: 10,
        status: 'upcoming'
      },
      {
        team1: createdTeams[4]._id, // Small team (2 players)
        team2: createdTeams[5]._id, // Small team (3 players)
        venue: 'Local Ground',
        date: new Date('2025-10-18'),
        overs: 5,
        status: 'upcoming'
      }
    ];

    for (let i = 0; i < matches.length; i++) {
      const matchData = matches[i];
      const team1 = createdTeams.find(t => t._id.equals(matchData.team1));
      const team2 = createdTeams.find(t => t._id.equals(matchData.team2));
      
      const match = await Match.create({
        ...matchData,
        innings: [
          {
            battingTeam: matchData.team1,
            bowlingTeam: matchData.team2,
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
            runRate: 0,
            currentOverBalls: []
          },
          {
            battingTeam: matchData.team2,
            bowlingTeam: matchData.team1,
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
            runRate: 0,
            currentOverBalls: []
          }
        ]
      });

      console.log(`  ✅ Created match: ${team1?.name} vs ${team2?.name} at ${matchData.venue}`);
    }

    console.log('\n🎉 Test data creation completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   • Teams created: ${createdTeams.length}`);
    console.log(`   • Players created: ${allPlayers.length}`);
    console.log(`   • Matches created: ${matches.length}`);
    
    console.log('\n🏏 Teams:');
    createdTeams.forEach((team, index) => {
      const teamPlayerCount = teamsData[index] ? teamsData[index].players.length : 0;
      console.log(`   ${index + 1}. ${team.name} (${teamPlayerCount} players)`);
    });

    console.log('\n👥 Player distribution:');
    console.log('   • 3 teams with 5 players each (standard teams)');
    console.log('   • 1 team with 2 players (testing small team)');
    console.log('   • 1 team with 3 players (testing small team)');
    console.log('🎯 Mix of full teams and small teams for testing different scenarios');
    console.log('📅 Match dates: Oct 15-18, 2025');
    console.log('⚠️  Match 4 includes small teams to test insufficient batsmen scenarios');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
    process.exit(0);
  }
};

createTestData();