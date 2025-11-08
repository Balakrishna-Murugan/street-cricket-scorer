import mongoose from 'mongoose';
import connectDB from '../config/database';
import { Player } from '../models/player.model';

const checkUser = async () => {
  try {
    await connectDB();
    const username = process.argv[2] || 'bala';
    const user = await Player.findOne({ username: username.toLowerCase() });
    if (!user) {
      console.log(`User ${username} not found`);
    } else {
      console.log('User found:', {
        _id: user._id.toString(),
        username: user.username,
        userRole: user.userRole,
        isGuest: user.isGuest,
        email: user.email,
      });
    }
  } catch (err) {
    console.error('Error checking user:', err);
  } finally {
    await mongoose.connection.close();
  }
};

checkUser();
