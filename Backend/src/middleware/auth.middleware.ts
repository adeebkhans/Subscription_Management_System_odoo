import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../core/errors/ApiError.js';
import { verifyAccessToken, type TokenPayload } from '../core/auth/tokens.js';

export type AuthenticatedRequest = Request & { auth?: TokenPayload };

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));

  try {
    (request as AuthenticatedRequest).auth = verifyAccessToken(token);
    return next();
  } catch {
    return next(new ApiError('Invalid or expired access token', 401, 'INVALID_TOKEN'));
  }
}

export function requireRole(...roles: TokenPayload['role'][]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) return next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
    if (!roles.includes(auth.role)) return next(new ApiError('You do not have permission', 403, 'FORBIDDEN'));
    return next();
  };
}
