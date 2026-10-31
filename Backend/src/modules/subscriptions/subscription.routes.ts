import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { autoClose, create, detail, list, renew, transition, update } from './subscription.controller.js';

export const subscriptionRoutes = Router();

subscriptionRoutes.use(requireAuth, requireRole('ADMIN', 'STAFF'));
subscriptionRoutes.get('/', list);
subscriptionRoutes.post('/', create);
subscriptionRoutes.post('/auto-close', requireRole('ADMIN'), autoClose);
subscriptionRoutes.get('/:id', detail);
subscriptionRoutes.patch('/:id', update);
subscriptionRoutes.post('/:id/transition', transition);
subscriptionRoutes.post('/:id/renew', renew);
