import express from 'express';
import { matchController } from '../controllers/match.controller';

const router = express.Router();

// GET all matches
router.get('/', matchController.getAll);

// GET match by ID
router.get('/:id', matchController.getById);

// POST create new match
router.post('/', matchController.create);

// PUT update match
router.put('/:id', matchController.update);

// PUT update match score (legacy)
router.put('/:matchId/score', matchController.updateScore);

// POST process a single ball (NEW ENHANCED ENDPOINT)
router.post('/:matchId/ball', matchController.processBall);

// GET bowler rotation options
router.get('/:matchId/bowler-rotation', matchController.getBowlerRotation);

// POST start new over
router.post('/:matchId/new-over', matchController.startNewOver);

// PUT update current batsmen
router.put('/:matchId/batsmen', matchController.updateBatsmen);

// DELETE match
router.delete('/:id', matchController.delete);

export const matchRoutes = router;