import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { createStaff, detail, list, update } from './user.controller.js';

export const userRoutes = Router();

userRoutes.use(requireAuth, requireRole('ADMIN'));
userRoutes.get('/', list);
userRoutes.post('/', createStaff);
userRoutes.get('/:id', detail);
userRoutes.patch('/:id', update);
