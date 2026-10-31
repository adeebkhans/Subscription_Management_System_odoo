import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { routeParam } from '../../core/http/params.js';
import {
  addPayment,
  applyInvoiceAction,
  generateInvoice,
  getInvoice,
  getInvoices,
  runBilling
} from './invoice.services.js';

export async function list(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getInvoices(request.query) });
  } catch (error) {
    next(error);
  }
}

export async function detail(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getInvoice(routeParam(request, 'id')) });
  } catch (error) {
    next(error);
  }
}

export async function generate(request: Request, response: Response, next: NextFunction) {
  try {
    const { userId } = (request as AuthenticatedRequest).auth!;
    response.status(201).json({ data: await generateInvoice(request.body, userId) });
  } catch (error) {
    next(error);
  }
}

export async function billingRun(request: Request, response: Response, next: NextFunction) {
  try {
    const { userId } = (request as AuthenticatedRequest).auth!;
    response.json({ data: await runBilling(request.body, userId) });
  } catch (error) {
    next(error);
  }
}

export async function action(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await applyInvoiceAction(routeParam(request, 'id'), request.body) });
  } catch (error) {
    next(error);
  }
}

export async function payment(request: Request, response: Response, next: NextFunction) {
  try {
    const { userId } = (request as AuthenticatedRequest).auth!;
    response.status(201).json({
      data: await addPayment(routeParam(request, 'id'), request.body, userId)
    });
  } catch (error) {
    next(error);
  }
}
