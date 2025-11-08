import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Player } from '../models/player.model';
import connectDB from '../config/database';

const testLogin = async () => {
  try {
    await connectDB();

    console.log('Testing admin login...');

    // Find admin user
    const user = await Player.findOne({ username: 'admin' }).select('+password');
    console.log('User found:', user ? {
      username: user.username,
      email: user.email,
      userRole: user.userRole,
      hasPassword: !!user.password
    } : 'Not found');

    if (user && user.password) {
      // Test password comparison
      const isValid = await bcrypt.compare('admin123', user.password);
      console.log('Password valid:', isValid);
    }

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

// Run the test
testLogin();