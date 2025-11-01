import express from 'express';
import { playerController } from '../controllers/player.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { creationLimitMiddleware } from '../middleware/creationLimit.middleware';
import { Request, Response, NextFunction } from 'express';

const router = express.Router();

// Update player teams (when team membership changes)
router.put('/update-teams', playerController.updatePlayerTeams);

// GET all players
router.get('/', authMiddleware.requireAuth, playerController.getAll);

// GET player by ID
router.get('/:id', authMiddleware.requireAuth, playerController.getById);

// GET conflicts for player (matches referencing any of player's teams)
router.get('/:id/conflicts', authMiddleware.requireAuth, playerController.conflicts);

// POST create new player
// POST create new player (auth + creation limit enforcement)
router.post('/', authMiddleware.requireAuth, creationLimitMiddleware.checkPlayerLimit, playerController.create);

// PUT update player
router.put('/:id', authMiddleware.requireAuth, playerController.update);

// DELETE player
router.delete('/:id', authMiddleware.requireAuth, playerController.delete);

// SuperAdmin routes
// Require authentication first, then superadmin check
// Temporary debug middleware: log headers for promote/demote requests to help diagnose 401s.
const logHeaders = (req: Request, res: Response, next: NextFunction) => {
	try {
		console.log(`DEBUG: promote/demote headers for ${req.method} ${req.originalUrl}:`, {
			authorization: req.headers['authorization'],
			'user-id': req.headers['user-id'],
			'x-user-id': req.headers['x-user-id']
		});
	} catch (e) {
		// ignore
	}
	next();
};

router.put('/:playerId/promote', logHeaders, authMiddleware.requireAuth, authMiddleware.requireSuperAdmin, playerController.promoteToAdmin);
router.put('/:playerId/demote', logHeaders, authMiddleware.requireAuth, authMiddleware.requireSuperAdmin, playerController.demoteFromAdmin);

export const playerRoutes = router;