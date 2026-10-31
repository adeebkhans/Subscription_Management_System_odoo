import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { createStaff, getUsers } from './user.controller.js';

export const userRoutes = Router();
userRoutes.use(requireAuth, requireRole('ADMIN'));
userRoutes.get('/', getUsers);
userRoutes.post('/', createStaff);
