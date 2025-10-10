import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import connectDB from './config/database';

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
import { playerRoutes } from './routes/player.routes';
import { teamRoutes } from './routes/team.routes';
import { matchRoutes } from './routes/match.routes';

app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Street Cricket Scorecard API' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});