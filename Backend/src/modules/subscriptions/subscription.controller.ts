import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { routeParam } from '../../core/http/params.js';
import { availableActions } from './lifecycle.js';
import type { PlanPolicy } from './lifecycle.js';
import {
  addSubscription,
  autoCloseExpiredSubscriptions,
  editSubscription,
  getSubscription,
  getSubscriptions,
  renewSubscription,
  transitionSubscription
} from './subscription.services.js';

export async function list(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getSubscriptions(request.query) });
  } catch (error) {
    next(error);
  }
}

export async function detail(request: Request, response: Response, next: NextFunction) {
  try {
    const subscription = await getSubscription(routeParam(request, 'id'));
    const policy: PlanPolicy = {
      allowEarlyClose: subscription.plan.allowEarlyClose,
      allowPause: subscription.plan.allowPause,
      allowRenew: subscription.plan.allowRenew,
      autoClose: subscription.plan.autoClose
    };

    response.json({
      data: {
        ...subscription,
        availableActions: availableActions(
          {
            status: subscription.status,
            startDate: subscription.startDate,
            expiryDate: subscription.expiryDate,
            quotationValidUntil: subscription.quotationValidUntil
          },
          policy
        )
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function create(request: Request, response: Response, next: NextFunction) {
  try {
    const { userId } = (request as AuthenticatedRequest).auth!;
    response.status(201).json({ data: await addSubscription(request.body, userId) });
  } catch (error) {
    next(error);
  }
}

export async function update(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await editSubscription(routeParam(request, 'id'), request.body) });
  } catch (error) {
    next(error);
  }
}

export async function transition(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await transitionSubscription(routeParam(request, 'id'), request.body) });
  } catch (error) {
    next(error);
  }
}

export async function renew(request: Request, response: Response, next: NextFunction) {
  try {
    const { userId } = (request as AuthenticatedRequest).auth!;
    response.status(201).json({ data: await renewSubscription(routeParam(request, 'id'), request.body, userId) });
  } catch (error) {
    next(error);
  }
}

export async function autoClose(_request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await autoCloseExpiredSubscriptions() });
  } catch (error) {
    next(error);
  }
}
