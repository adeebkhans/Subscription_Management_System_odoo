import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { create, detail, list, remove, update } from './discount.controller.js';

export const discountRoutes = Router();

discountRoutes.use(requireAuth, requireRole('ADMIN'));
discountRoutes.get('/', list);
discountRoutes.post('/', create);
discountRoutes.get('/:id', detail);
discountRoutes.patch('/:id', update);
discountRoutes.delete('/:id', remove);
