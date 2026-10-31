import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { routeParam } from '../../core/http/params.js';
import {
  createStaffAccount,
  editUser,
  getUser,
  getUsers
} from './user.services.js';

export async function list(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getUsers(request.query) });
  } catch (error) {
    next(error);
  }
}

export async function detail(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await getUser(routeParam(request, 'id')) });
  } catch (error) {
    next(error);
  }
}

export async function createStaff(request: Request, response: Response, next: NextFunction) {
  try {
    response.status(201).json({ data: await createStaffAccount(request.body) });
  } catch (error) {
    next(error);
  }
}

export async function update(request: Request, response: Response, next: NextFunction) {
  try {
    const actorId = (request as AuthenticatedRequest).auth!.userId;
    response.json({ data: await editUser(routeParam(request, 'id'), request.body, actorId) });
  } catch (error) {
    next(error);
  }
}
