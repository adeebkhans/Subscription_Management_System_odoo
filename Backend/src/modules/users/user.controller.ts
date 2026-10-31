import type { Request, Response, NextFunction } from 'express';
import { listUsers, registerStaff } from './user.services.js';

export async function getUsers(_request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await listUsers() });
  } catch (error) {
    next(error);
  }
}

export async function createStaff(request: Request, response: Response, next: NextFunction) {
  try {
    response.status(201).json({ data: await registerStaff(request.body) });
  } catch (error) {
    next(error);
  }
}
