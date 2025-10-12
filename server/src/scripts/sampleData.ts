import mongoose from 'mongoose';
import { Team } from '../models/team.model';
import { Player } from '../models/player.model';
import { Match } from '../models/match.model';
import Over from '../models/over.model';
import connectDB from '../config/database';

const sampleData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Team.deleteMany({});
    await Player.deleteMany({});
    await Match.deleteMany({});
    await Over.deleteMany({});

    // Create initial players who will be captains
    const captain1 = await Player.create({
      name: 'Rahul Kumar',
      age: 25,
      role: 'all-rounder',
      battingStyle: 'right-handed',
      bowlingStyle: 'right-arm medium'
    });

    const captain2 = await Player.create({
      name: 'Vijay Kumar',
      age: 26,
      role: 'all-rounder',
      battingStyle: 'right-handed',
      bowlingStyle: 'left-arm spin'
    });

    // Create Teams with captains
    const team1 = await Team.create({
      name: 'Street Warriors',
      captain: captain1._id,
      members: [captain1._id]
    });

    const team2 = await Team.create({
      name: 'Local Strikers',
      captain: captain2._id,
      members: [captain2._id]
    });

    // Create Players for Team 1
    const team1Players = await Player.create([
      {
        name: 'Suresh Singh',
        age: 28,
        role: 'batsman',
        battingStyle: 'right-handed',
        teams: [team1._id]
      },
      {
        name: 'Amit Patel',
        age: 24,
        role: 'bowler',
        bowlingStyle: 'right-arm fast',
        teams: [team1._id]
      },
      {
        name: 'Rajesh Kumar',
        age: 26,
        role: 'all-rounder',
        battingStyle: 'right-handed',
        bowlingStyle: 'right-arm medium',
        teams: [team1._id]
      },
      {
        name: 'Anil Sharma',
        age: 23,
        role: 'batsman',
        battingStyle: 'left-handed',
        teams: [team1._id]
      },
      {
        name: 'Dinesh Karthik',
        age: 29,
        role: 'batsman',
        battingStyle: 'right-handed',
        teams: [team1._id]
      },
      {
        name: 'Praveen Kumar',
        age: 27,
        role: 'bowler',
        bowlingStyle: 'right-arm medium',
        teams: [team1._id]
      },
      {
        name: 'Sunil Kumar',
        age: 25,
        role: 'all-rounder',
        battingStyle: 'left-handed',
        bowlingStyle: 'left-arm spin',
        teams: [team1._id]
      },
      {
        name: 'Ravi Kumar',
        age: 26,
        role: 'bowler',
        bowlingStyle: 'left-arm fast',
        teams: [team1._id]
      },
      {
        name: 'Ajay Singh',
        age: 24,
        role: 'batsman',
        battingStyle: 'right-handed',
        teams: [team1._id]
      },
      {
        name: 'Sanjay Yadav',
        age: 25,
        role: 'all-rounder',
        battingStyle: 'left-handed',
        bowlingStyle: 'left-arm spin',
        teams: [team1._id]
      },
      {
        name: 'Mohit Sharma',
        age: 28,
        role: 'bowler',
        bowlingStyle: 'right-arm medium',
        teams: [team1._id]
      }
    ]);

    // Create Players for Team 2
    const team2Players = await Player.create([
      {
        name: 'Ravi Shankar',
        age: 27,
        role: 'batsman',
        battingStyle: 'right-handed',
        teams: [team2._id]
      },
      {
        name: 'Karthik Raja',
        age: 25,
        role: 'bowler',
        bowlingStyle: 'right-arm medium',
        teams: [team2._id]
      },
      {
        name: 'Ashwin Kumar',
        age: 28,
        role: 'all-rounder',
        battingStyle: 'right-handed',
        bowlingStyle: 'off-spin',
        teams: [team2._id]
      },
      {
        name: 'Vijay Shankar',
        age: 26,
        role: 'all-rounder',
        battingStyle: 'right-handed',
        bowlingStyle: 'medium-fast',
        teams: [team2._id]
      },
      {
        name: 'Rahul Dravid',
        age: 24,
        role: 'batsman',
        battingStyle: 'right-handed',
        teams: [team2._id]
      },
      {
        name: 'Sachin Kumar',
        age: 23,
        role: 'batsman',
        battingStyle: 'right-handed',
        teams: [team2._id]
      },
      {
        name: 'Harbhajan Singh',
        age: 29,
        role: 'bowler',
        bowlingStyle: 'off-spin',
        teams: [team2._id]
      },
      {
        name: 'Zaheer Khan',
        age: 27,
        role: 'bowler',
        bowlingStyle: 'left-arm fast',
        teams: [team2._id]
      },
      {
        name: 'Yuvraj Singh',
        age: 25,
        role: 'all-rounder',
        battingStyle: 'left-handed',
        bowlingStyle: 'left-arm spin',
        teams: [team2._id]
      },
      {
        name: 'MS Dhoni',
        age: 28,
        role: 'batsman',
        battingStyle: 'right-handed',
        teams: [team2._id]
      },
      {
        name: 'Ishant Sharma',
        age: 26,
        role: 'bowler',
        bowlingStyle: 'right-arm fast',
        teams: [team2._id]
      }
    ]);

    // Update team captains
    await Team.findByIdAndUpdate(team1._id, { captain: team1Players[0]._id });
    await Team.findByIdAndUpdate(team2._id, { captain: team2Players[0]._id });

    // Create multiple sample matches with different statuses
    const matches = await Match.create([
      {
        team1: team1._id,
        team2: team2._id,
        date: new Date(),
        venue: 'Local Ground, Chennai',
        overs: 5,
        status: 'in-progress',
        tossWinner: team1._id,
        tossDecision: 'bat',
        innings: [
          {
            battingTeam: team1._id,
            bowlingTeam: team2._id,
            totalRuns: 0,
            wickets: 0,
            overs: 0,
            battingStats: [],
            bowlingStats: [],
            extras: {
              wides: 0,
              noBalls: 0,
              byes: 0,
              legByes: 0
            }
          }
        ]
      },
      {
        team1: team2._id,
        team2: team1._id,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        venue: 'Sports Club, Mumbai',
        overs: 10,
        status: 'upcoming',
        innings: [
          {
            battingTeam: team2._id,
            bowlingTeam: team1._id,
            totalRuns: 0,
            wickets: 0,
            overs: 0,
            battingStats: [],
            bowlingStats: [],
            extras: {
              wides: 0,
              noBalls: 0,
              byes: 0,
              legByes: 0
            }
          }
        ]
      },
      {
        team1: team1._id,
        team2: team2._id,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        venue: 'Stadium, Delhi',
        overs: 20,
        status: 'completed',
        tossWinner: team2._id,
        tossDecision: 'bowl',
        result: 'Street Warriors won by 25 runs',
        innings: [
          {
            battingTeam: team1._id,
            bowlingTeam: team2._id,
            totalRuns: 156,
            wickets: 8,
            overs: 20,
            isCompleted: true,
            battingStats: [],
            bowlingStats: [],
            extras: {
              wides: 8,
              noBalls: 2,
              byes: 3,
              legByes: 1
            }
          },
          {
            battingTeam: team2._id,
            bowlingTeam: team1._id,
            totalRuns: 131,
            wickets: 10,
            overs: 18.4,
            isCompleted: true,
            battingStats: [],
            bowlingStats: [],
            extras: {
              wides: 5,
              noBalls: 1,
              byes: 2,
              legByes: 0
            }
          }
        ]
      },
      {
        team1: team2._id,
        team2: team1._id,
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        venue: 'Ground A, Bangalore',
        overs: 15,
        status: 'upcoming',
        innings: [
          {
            battingTeam: team2._id,
            bowlingTeam: team1._id,
            totalRuns: 0,
            wickets: 0,
            overs: 0,
            battingStats: [],
            bowlingStats: [],
            extras: {
              wides: 0,
              noBalls: 0,
              byes: 0,
              legByes: 0
            }
          }
        ]
      }
    ]);

    console.log('Sample data inserted successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error inserting sample data:', error);
    process.exit(1);
  }
};

sampleData();