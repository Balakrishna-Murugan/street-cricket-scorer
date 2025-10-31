import express from 'express';
import { playerController } from '../controllers/player.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { creationLimitMiddleware } from '../middleware/creationLimit.middleware';

const router = express.Router();

// Update player teams (when team membership changes)
router.put('/update-teams', playerController.updatePlayerTeams);

// GET all players
router.get('/', authMiddleware.requireAuth, playerController.getAll);

// GET player by ID
router.get('/:id', authMiddleware.requireAuth, playerController.getById);

// POST create new player
// POST create new player (auth + creation limit enforcement)
router.post('/', authMiddleware.requireAuth, creationLimitMiddleware.checkPlayerLimit, playerController.create);

// PUT update player
router.put('/:id', authMiddleware.requireAuth, playerController.update);

// DELETE player
router.delete('/:id', authMiddleware.requireAuth, playerController.delete);

// SuperAdmin routes
// Require authentication first, then superadmin check
router.put('/:playerId/promote', authMiddleware.requireAuth, authMiddleware.requireSuperAdmin, playerController.promoteToAdmin);
router.put('/:playerId/demote', authMiddleware.requireAuth, authMiddleware.requireSuperAdmin, playerController.demoteFromAdmin);

export const playerRoutes = router;