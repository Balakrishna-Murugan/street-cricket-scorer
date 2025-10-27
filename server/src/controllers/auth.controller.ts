import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Player } from '../models/player.model';

export const authController = {
  // Login with username/password
  login: async (req: Request, res: Response) => {
    try {
      console.log('Login request received:', req.body);

      const { username, password } = req.body;

      if (!username || !password) {
        console.log('Missing username or password');
        return res.status(400).json({ message: 'Username and password are required' });
      }

      // Find user by username or email
      const user = await Player.findOne({
        $or: [
          { username: username.toLowerCase() },
          { email: username.toLowerCase() }
        ]
      }).select('+password');

      console.log('User lookup result:', user ? { username: user.username, hasPassword: !!user.password } : 'User not found');

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      if (!user.password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log('Password validation result:', isValidPassword);

      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Return user data (excluding password)
      const userData = {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        userRole: user.userRole,
        isGuest: user.isGuest,
        age: user.age,
        battingStyle: user.battingStyle,
        bowlingStyle: user.bowlingStyle,
        teams: user.teams
      };

      console.log('Login successful for user:', user.username);
      res.json({
        message: 'Login successful',
        user: userData
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ message: error.message || 'Login failed' });
    }
  },

  // Register new user
  register: async (req: Request, res: Response) => {
    try {
      const { name, email, username, password, age, role, userRole } = req.body;

      if (!name || !email || !username || !password) {
        return res.status(400).json({ message: 'Name, email, username, and password are required' });
      }

      // Check if user already exists
      const existingUser = await Player.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      });

      if (existingUser) {
        return res.status(409).json({ message: 'User with this email or username already exists' });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create new player with auth fields
      const newPlayer = await Player.create({
        name,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password: hashedPassword,
        age: age || 25,
        role: role || 'batsman',
        userRole: userRole || 'player',
        isGuest: false
      });

      // Return user data (excluding password)
      const userData = {
        _id: newPlayer._id,
        name: newPlayer.name,
        username: newPlayer.username,
        email: newPlayer.email,
        role: newPlayer.role,
        userRole: newPlayer.userRole,
        isGuest: newPlayer.isGuest,
        age: newPlayer.age,
        battingStyle: newPlayer.battingStyle,
        bowlingStyle: newPlayer.bowlingStyle,
        teams: newPlayer.teams
      };

      res.status(201).json({
        message: 'Registration successful',
        user: userData
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ message: error.message || 'Registration failed' });
    }
  },

  // Guest login - create temporary guest user
  guestLogin: async (req: Request, res: Response) => {
    try {
      console.log('Guest login request received:', req.body);

      const { name } = req.body;

      if (!name || name.trim().length === 0) {
        console.log('Guest login: Name is required');
        return res.status(400).json({ message: 'Name is required for guest login' });
      }

      // Create guest user with random username
      const guestUsername = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const guestPlayer = await Player.create({
        name: name.trim(),
        username: guestUsername,
        age: 25,
        role: 'batsman',
        isGuest: true,
        userRole: 'viewer',
        // Guest limitations
        guestLimitations: {
          maxMatches: 1,
          basicScoringOnly: true, // Only 1-6 runs and catch wickets
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      console.log('Guest user created:', guestPlayer.username);

      // Return user data
      const userData = {
        _id: guestPlayer._id,
        name: guestPlayer.name,
        username: guestPlayer.username,
        role: guestPlayer.role,
        userRole: guestPlayer.userRole,
        isGuest: guestPlayer.isGuest,
        guestLimitations: guestPlayer.guestLimitations,
        age: guestPlayer.age,
        battingStyle: guestPlayer.battingStyle,
        bowlingStyle: guestPlayer.bowlingStyle,
        teams: guestPlayer.teams
      };

      res.status(201).json({
        message: 'Guest login successful',
        user: userData
      });
    } catch (error: any) {
      console.error('Guest login error:', error);
      res.status(500).json({ message: error.message || 'Guest login failed' });
    }
  },

  // Check if user exists by email (for Google login)
  checkUserByEmail: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await Player.findOne({ email: email.toLowerCase() });

      if (user) {
        res.json({
          exists: true,
          user: {
            _id: user._id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            userRole: user.userRole,
            isGuest: user.isGuest
          }
        });
      } else {
        res.json({ exists: false });
      }
    } catch (error: any) {
      console.error('Check user error:', error);
      res.status(500).json({ message: error.message || 'Failed to check user' });
    }
  }
};