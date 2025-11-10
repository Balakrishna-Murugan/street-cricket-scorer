import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Temporary SMTP verification at startup (useful for debugging Render env)
// This will attempt to verify SMTP auth and log a concise success/failure message.
// IMPORTANT: This is a transient debug helper — remove it after use.
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    // dynamic require so nodemailer is only used when SMTP configured
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require('nodemailer');
    const verifier = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    verifier.verify()
      .then(() => console.log('SMTP verify OK'))
      .catch((err: any) => {
        // Log only the error/response text to help diagnose (do not log secrets)
        console.error('SMTP verify failed:', err && err.response ? err.response : (err && err.message ? err.message : err));
      });
  } catch (e: any) {
    console.error('SMTP verify setup failed:', e && e.message ? e.message : e);
  }
} else {
  console.log('SMTP not fully configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing)');
}

import connectDB from './config/database';

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
// Enable CORS and explicitly allow Authorization and user-id headers which browsers may otherwise block
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'user-id', 'x-user-id'],
  exposedHeaders: ['Authorization', 'user-id']
}));
app.use(express.json());

// Routes
import { playerRoutes } from './routes/player.routes';
import { teamRoutes } from './routes/team.routes';
import { matchRoutes } from './routes/match.routes';
import { authRoutes } from './routes/auth.routes';
import { docsRoutes } from './routes/docs.routes';

app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/docs', docsRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Street Cricket Scorecard API' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});