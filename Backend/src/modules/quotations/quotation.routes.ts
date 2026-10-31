import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { create, detail, list, remove, update } from './quotation.controller.js';

export const quotationRoutes = Router();

quotationRoutes.use(requireAuth, requireRole('ADMIN', 'STAFF'));
quotationRoutes.get('/', list);
quotationRoutes.post('/', create);
quotationRoutes.get('/:id', detail);
quotationRoutes.patch('/:id', update);
quotationRoutes.delete('/:id', remove);
