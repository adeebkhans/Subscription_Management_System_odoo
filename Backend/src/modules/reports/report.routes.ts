import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { finance, overdue } from './report.controller.js';

export const reportRoutes = Router();

reportRoutes.use(requireAuth, requireRole('ADMIN', 'STAFF'));
reportRoutes.get('/finance', finance);
reportRoutes.get('/overdue-invoices', overdue);
