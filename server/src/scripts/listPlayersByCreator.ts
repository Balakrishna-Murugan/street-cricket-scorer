import mongoose from 'mongoose';
import connectDB from '../config/database';
import { Player } from '../models/player.model';

const run = async () => {
  try {
    await connectDB();
    const userId = process.argv[2] || '6902b4827f1f59b4af99df68';
    const players = await Player.find({ createdBy: userId }).lean();
    console.log(`Players created by ${userId}:`, players.length);
    players.forEach(p => console.log(p.name, p._id.toString()));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
  }
};

run();
