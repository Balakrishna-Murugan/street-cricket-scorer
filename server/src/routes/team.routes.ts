import express from 'express';
import { teamController } from '../controllers/team.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { creationLimitMiddleware } from '../middleware/creationLimit.middleware';

const router = express.Router();

// GET all teams
router.get('/', authMiddleware.requireAuth, teamController.getAll);

// GET team by ID
router.get('/:id', authMiddleware.requireAuth, teamController.getById);

// GET conflicts for team (in-progress matches referencing the team)
router.get('/:id/conflicts', authMiddleware.requireAuth, teamController.conflicts);

// POST create new team
// POST create new team (auth + creation limit enforcement)
router.post('/', authMiddleware.requireAuth, creationLimitMiddleware.checkTeamLimit, teamController.create);

// PUT update team
router.put('/:id', authMiddleware.requireAuth, teamController.update);

// DELETE team
router.delete('/:id', authMiddleware.requireAuth, teamController.delete);

export const teamRoutes = router;