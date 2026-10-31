import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { createPlan, createProduct, listPlans, listProducts } from './catalog.controller.js';

export const catalogRoutes = Router();
catalogRoutes.get('/products', listProducts);
catalogRoutes.get('/plans', listPlans);
catalogRoutes.post('/products', requireAuth, requireRole('ADMIN'), createProduct);
catalogRoutes.post('/plans', requireAuth, requireRole('ADMIN', 'STAFF'), createPlan);
