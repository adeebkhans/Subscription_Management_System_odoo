import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { routeParam } from '../../core/http/params.js';
import {
  addPlan,
  addProduct,
  deactivatePlan,
  deactivateProduct,
  editPlan,
  editProduct,
  getPlan,
  getPlans,
  getProduct,
  getProducts
} from './catalog.services.js';

export async function listProducts(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getProducts(request.query) });
  } catch (error) {
    next(error);
  }
}

export async function productDetail(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getProduct(routeParam(request, 'id')) });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(request: Request, response: Response, next: NextFunction) {
  try {
    const { userId } = (request as AuthenticatedRequest).auth!;
    response.status(201).json({ data: await addProduct(request.body, userId) });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await editProduct(routeParam(request, 'id'), request.body) });
  } catch (error) {
    next(error);
  }
}

export async function removeProduct(request: Request, response: Response, next: NextFunction) {
  try {
    await deactivateProduct(routeParam(request, 'id'));
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listPlans(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getPlans(request.query) });
  } catch (error) {
    next(error);
  }
}

export async function planDetail(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getPlan(routeParam(request, 'id')) });
  } catch (error) {
    next(error);
  }
}

export async function createPlan(request: Request, response: Response, next: NextFunction) {
  try {
    const { userId } = (request as AuthenticatedRequest).auth!;
    response.status(201).json({ data: await addPlan(request.body, userId) });
  } catch (error) {
    next(error);
  }
}

export async function updatePlan(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await editPlan(routeParam(request, 'id'), request.body) });
  } catch (error) {
    next(error);
  }
}

export async function removePlan(request: Request, response: Response, next: NextFunction) {
  try {
    await deactivatePlan(routeParam(request, 'id'));
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}
