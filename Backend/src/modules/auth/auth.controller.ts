import type { Request, Response, NextFunction } from 'express';
import { authenticate, registerCustomer } from './auth.services.js';

function cookies(response: Response, result: { accessToken: string; refreshToken: string }) {
  response.cookie('accessToken', result.accessToken, { httpOnly: true, sameSite: 'lax' });
  response.cookie('refreshToken', result.refreshToken, { httpOnly: true, sameSite: 'lax' });
}

export async function signup(request: Request, response: Response, next: NextFunction) {
  try {
    const result = await registerCustomer(request.body);
    cookies(response, result);
    response.status(201).json({ data: { user: result.user } });
  } catch (error) { next(error); }
}

export async function login(request: Request, response: Response, next: NextFunction) {
  try {
    const result = await authenticate(request.body);
    cookies(response, result);
    response.json({ data: { user: result.user } });
  } catch (error) { next(error); }
}

export async function logout(_request: Request, response: Response) {
  response.clearCookie('accessToken');
  response.clearCookie('refreshToken');
  response.status(204).send();
}
