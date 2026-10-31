import type { NextFunction, Request, Response } from 'express';
import { routeParam } from '../../core/http/params.js';
import {
  addPaymentTerm,
  deactivatePaymentTerm,
  editPaymentTerm,
  getPaymentTerm,
  getPaymentTerms
} from './payment-term.services.js';

export async function list(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getPaymentTerms(request.query) });
  } catch (error) {
    next(error);
  }
}

export async function detail(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getPaymentTerm(routeParam(request, 'id')) });
  } catch (error) {
    next(error);
  }
}

export async function create(request: Request, response: Response, next: NextFunction) {
  try {
    response.status(201).json({ data: await addPaymentTerm(request.body) });
  } catch (error) {
    next(error);
  }
}

export async function update(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await editPaymentTerm(routeParam(request, 'id'), request.body) });
  } catch (error) {
    next(error);
  }
}

export async function remove(request: Request, response: Response, next: NextFunction) {
  try {
    await deactivatePaymentTerm(routeParam(request, 'id'));
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}
