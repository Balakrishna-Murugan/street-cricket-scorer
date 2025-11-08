import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Player } from '../models/player.model';
import connectDB from '../config/database';

const createSuperAdminUser = async () => {
  try {
    await connectDB();

    // Check if superadmin user already exists
    const existingSuperAdmin = await Player.findOne({ username: 'superadmin' });
    if (existingSuperAdmin) {
      console.log('SuperAdmin user already exists');
      return;
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('superadmin123', saltRounds);

    // Create superadmin user
    const superAdminUser = await Player.create({
      name: 'Super Administrator',
      username: 'superadmin',
      email: 'superadmin@cricketscorer.com',
      password: hashedPassword,
      age: 35,
      role: 'all-rounder',
      userRole: 'superadmin',
      isGuest: false
    });

    console.log('SuperAdmin user created successfully:', {
      id: superAdminUser._id,
      username: superAdminUser.username,
      email: superAdminUser.email,
      role: superAdminUser.userRole
    });

  } catch (error) {
    console.error('Error creating superadmin user:', error);
  } finally {
    await mongoose.connection.close();
  }
};

// Run the script
createSuperAdminUser();