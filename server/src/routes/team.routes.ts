import express from 'express';
import { teamController } from '../controllers/team.controller';

const router = express.Router();

// GET all teams
router.get('/', teamController.getAll);

// GET team by ID
router.get('/:id', teamController.getById);

// POST create new team
router.post('/', teamController.create);

// PUT update team
router.put('/:id', teamController.update);

// DELETE team
router.delete('/:id', teamController.delete);

export const teamRoutes = router;