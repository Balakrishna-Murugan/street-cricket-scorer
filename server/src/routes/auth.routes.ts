import express from 'express';
import { authController } from '../controllers/auth.controller';

const router = express.Router();

// POST login
router.post('/login', authController.login);

// POST register
router.post('/register', authController.register);

// POST guest login
router.post('/guest-login', authController.guestLogin);

// POST check user by email (for Google login)
router.post('/check-email', authController.checkUserByEmail);

export const authRoutes = router;