import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { invoiceDetail, invoices, subscriptionDetail, subscriptions } from './portal.controller.js';

export const portalRoutes = Router();

portalRoutes.use(requireAuth, requireRole('CUSTOMER'));
portalRoutes.get('/subscriptions', subscriptions);
portalRoutes.get('/subscriptions/:id', subscriptionDetail);
portalRoutes.get('/invoices', invoices);
portalRoutes.get('/invoices/:id', invoiceDetail);
