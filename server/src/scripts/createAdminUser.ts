import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Player } from '../models/player.model';
import connectDB from '../config/database';

const createAdminUser = async () => {
  try {
    await connectDB();

    // Check if admin user already exists
    const existingAdmin = await Player.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);

    // Create admin user
    const adminUser = await Player.create({
      name: 'Administrator',
      username: 'admin',
      email: 'admin@cricketscorer.com',
      password: hashedPassword,
      age: 30,
      role: 'batsman',
      userRole: 'admin',
      isGuest: false
    });

    console.log('Admin user created successfully:', {
      id: adminUser._id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.userRole
    });

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.connection.close();
  }
};

// Run the script
createAdminUser();