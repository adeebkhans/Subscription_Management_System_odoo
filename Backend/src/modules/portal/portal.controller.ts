import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { routeParam } from '../../core/http/params.js';
import {
  getPortalInvoice,
  getPortalInvoices,
  getPortalSubscription,
  getPortalSubscriptions
} from './portal.services.js';

function customerId(request: Request) {
  return (request as AuthenticatedRequest).auth!.userId;
}

export async function subscriptions(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getPortalSubscriptions(customerId(request), request.query) });
  } catch (error) {
    next(error);
  }
}

export async function subscriptionDetail(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({
      data: await getPortalSubscription(customerId(request), routeParam(request, 'id'))
    });
  } catch (error) {
    next(error);
  }
}

export async function invoices(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getPortalInvoices(customerId(request), request.query) });
  } catch (error) {
    next(error);
  }
}

export async function invoiceDetail(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getPortalInvoice(customerId(request), routeParam(request, 'id')) });
  } catch (error) {
    next(error);
  }
}
