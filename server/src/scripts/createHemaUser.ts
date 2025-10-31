import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Player } from '../models/player.model';
import connectDB from '../config/database';

const createHemaUser = async () => {
  try {
    await connectDB();

    // Check if hema user already exists
    const existing = await Player.findOne({ username: 'hema' });
    if (existing) {
      console.log('Hema user already exists');
      return;
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('hema123', saltRounds);

    const hema = await Player.create({
      name: 'Hema',
      username: 'hema',
      email: 'hema@example.com',
      password: hashedPassword,
      age: 25,
      role: 'batsman',
      userRole: 'player',
      isGuest: false
    });

    console.log('Hema user created successfully:', {
      id: hema._id,
      username: hema.username,
      email: hema.email,
      role: hema.userRole
    });

  } catch (error) {
    console.error('Error creating Hema user:', error);
  } finally {
    await mongoose.connection.close();
  }
};

createHemaUser();
