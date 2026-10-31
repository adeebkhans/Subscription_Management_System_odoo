import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { create, detail, list, remove, update } from './payment-term.controller.js';

export const paymentTermRoutes = Router();

paymentTermRoutes.get('/', requireAuth, list);
paymentTermRoutes.get('/:id', requireAuth, detail);
paymentTermRoutes.post('/', requireAuth, requireRole('ADMIN'), create);
paymentTermRoutes.patch('/:id', requireAuth, requireRole('ADMIN'), update);
paymentTermRoutes.delete('/:id', requireAuth, requireRole('ADMIN'), remove);
