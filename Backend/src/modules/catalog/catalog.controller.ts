import type { Request, Response, NextFunction } from 'express';
import { addPlan, addProduct, getPlans, getProducts } from './catalog.services.js';
import { type AuthenticatedRequest } from '../../middleware/auth.middleware.js';

export async function listProducts(_request: Request, response: Response, next: NextFunction) {
  try { response.json({ data: await getProducts() }); } catch (error) { next(error); }
}

export async function listPlans(_request: Request, response: Response, next: NextFunction) {
  try { response.json({ data: await getPlans() }); } catch (error) { next(error); }
}

export async function createProduct(request: Request, response: Response, next: NextFunction) {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    response.status(201).json({ data: await addProduct(request.body, auth!.userId) });
  } catch (error) { next(error); }
}

export async function createPlan(request: Request, response: Response, next: NextFunction) {
  try { response.status(201).json({ data: await addPlan(request.body) }); } catch (error) { next(error); }
}
