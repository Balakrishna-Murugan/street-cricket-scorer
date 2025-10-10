import express from 'express';
import { playerController } from '../controllers/player.controller';

const router = express.Router();

// GET all players
router.get('/', playerController.getAll);

// GET player by ID
router.get('/:id', playerController.getById);

// POST create new player
router.post('/', playerController.create);

// PUT update player
router.put('/:id', playerController.update);

// DELETE player
router.delete('/:id', playerController.delete);

export const playerRoutes = router;