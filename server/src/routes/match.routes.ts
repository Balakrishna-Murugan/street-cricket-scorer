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

// PUT update match score
router.put('/:matchId/score', matchController.updateScore);

// DELETE match
router.delete('/:id', matchController.delete);

export const matchRoutes = router;