import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import {
  createPlan,
  createProduct,
  listPlans,
  listProducts,
  planDetail,
  productDetail,
  removePlan,
  removeProduct,
  updatePlan,
  updateProduct
} from './catalog.controller.js';

export const catalogRoutes = Router();

catalogRoutes.get('/products', listProducts);
catalogRoutes.get('/products/:id', productDetail);
catalogRoutes.get('/plans', listPlans);
catalogRoutes.get('/plans/:id', planDetail);

catalogRoutes.post('/products', requireAuth, requireRole('ADMIN'), createProduct);
catalogRoutes.patch('/products/:id', requireAuth, requireRole('ADMIN'), updateProduct);
catalogRoutes.delete('/products/:id', requireAuth, requireRole('ADMIN'), removeProduct);

catalogRoutes.post('/plans', requireAuth, requireRole('ADMIN'), createPlan);
catalogRoutes.patch('/plans/:id', requireAuth, requireRole('ADMIN'), updatePlan);
catalogRoutes.delete('/plans/:id', requireAuth, requireRole('ADMIN'), removePlan);
