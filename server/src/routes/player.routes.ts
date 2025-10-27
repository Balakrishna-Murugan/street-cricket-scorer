import express from 'express';
import { playerController } from '../controllers/player.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// Update player teams (when team membership changes)
router.put('/update-teams', playerController.updatePlayerTeams);

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

// SuperAdmin routes
router.put('/:playerId/promote', authMiddleware.requireSuperAdmin, playerController.promoteToAdmin);
router.put('/:playerId/demote', authMiddleware.requireSuperAdmin, playerController.demoteFromAdmin);

export const playerRoutes = router;