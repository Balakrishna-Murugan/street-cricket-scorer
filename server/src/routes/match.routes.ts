import express from 'express';
import { matchController } from '../controllers/match.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// GET all matches
router.get('/', authMiddleware.requireAuth, matchController.getAll);

// GET match by ID
router.get('/:id', authMiddleware.requireAuth, matchController.getById);

// POST create new match
router.post('/', authMiddleware.requireAuth, matchController.create);

// PUT update match
router.put('/:id', authMiddleware.requireAuth, matchController.update);

// PUT update match score (legacy)
router.put('/:matchId/score', authMiddleware.requireAuth, matchController.updateScore);

// POST process a single ball (NEW ENHANCED ENDPOINT)
router.post('/:matchId/ball', authMiddleware.requireAuth, matchController.processBall);

// GET bowler rotation options
router.get('/:matchId/bowler-rotation', authMiddleware.requireAuth, matchController.getBowlerRotation);

// POST start new over
router.post('/:matchId/new-over', authMiddleware.requireAuth, matchController.startNewOver);

// PUT update current batsmen
router.put('/:matchId/batsmen', authMiddleware.requireAuth, matchController.updateBatsmen);

// POST send match summary via email (body: { email })
router.post('/:matchId/send-summary', authMiddleware.requireAuth, matchController.sendSummary);

// DELETE match
router.delete('/:id', authMiddleware.requireAuth, matchController.delete);

export const matchRoutes = router;