import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { action, billingRun, detail, generate, list, payment } from './invoice.controller.js';

export const invoiceRoutes = Router();

invoiceRoutes.use(requireAuth, requireRole('ADMIN', 'STAFF'));
invoiceRoutes.get('/', list);
invoiceRoutes.post('/generate', generate);
invoiceRoutes.post('/billing-run', requireRole('ADMIN'), billingRun);
invoiceRoutes.get('/:id', detail);
invoiceRoutes.post('/:id/action', action);
invoiceRoutes.post('/:id/payments', payment);
