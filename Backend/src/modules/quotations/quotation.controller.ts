import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { routeParam } from '../../core/http/params.js';
import {
  addQuotation,
  deactivateQuotation,
  editQuotation,
  getQuotation,
  getQuotations
} from './quotation.services.js';

export async function list(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getQuotations(request.query) });
  } catch (error) {
    next(error);
  }
}

export async function detail(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getQuotation(routeParam(request, 'id')) });
  } catch (error) {
    next(error);
  }
}

export async function create(request: Request, response: Response, next: NextFunction) {
  try {
    const { userId } = (request as AuthenticatedRequest).auth!;
    response.status(201).json({ data: await addQuotation(request.body, userId) });
  } catch (error) {
    next(error);
  }
}

export async function update(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await editQuotation(routeParam(request, 'id'), request.body) });
  } catch (error) {
    next(error);
  }
}

export async function remove(request: Request, response: Response, next: NextFunction) {
  try {
    await deactivateQuotation(routeParam(request, 'id'));
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}
