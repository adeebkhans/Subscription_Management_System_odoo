import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { routeParam } from '../../core/http/params.js';
import {
  addDiscountRule,
  deactivateDiscountRule,
  editDiscountRule,
  getDiscountRule,
  getDiscountRules
} from './discount.services.js';

export async function list(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getDiscountRules(request.query) });
  } catch (error) {
    next(error);
  }
}

export async function detail(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getDiscountRule(routeParam(request, 'id')) });
  } catch (error) {
    next(error);
  }
}

export async function create(request: Request, response: Response, next: NextFunction) {
  try {
    const { userId } = (request as AuthenticatedRequest).auth!;
    response.status(201).json({ data: await addDiscountRule(request.body, userId) });
  } catch (error) {
    next(error);
  }
}

export async function update(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await editDiscountRule(routeParam(request, 'id'), request.body) });
  } catch (error) {
    next(error);
  }
}

export async function remove(request: Request, response: Response, next: NextFunction) {
  try {
    await deactivateDiscountRule(routeParam(request, 'id'));
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}
