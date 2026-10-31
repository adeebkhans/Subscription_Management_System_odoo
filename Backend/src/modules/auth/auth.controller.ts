import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import {
  authenticate,
  currentUser,
  refreshSession,
  registerCustomer,
  revokeSession,
  revokeSessionFromRefreshToken,
  requestPasswordReset,
  resetPassword
} from './auth.services.js';
import type { SessionResult } from './auth.types.js';

function writeSessionCookies(response: Response, session: SessionResult) {
  const options = { httpOnly: true, sameSite: 'lax' as const, path: '/' };
  response.cookie('accessToken', session.accessToken, options);
  response.cookie('refreshToken', session.refreshToken, options);
}

export async function signup(request: Request, response: Response, next: NextFunction) {
  try {
    const session = await registerCustomer(request.body);
    writeSessionCookies(response, session);
    response.status(201).json({ data: { user: session.user } });
  } catch (error) {
    next(error);
  }
}

export async function login(request: Request, response: Response, next: NextFunction) {
  try {
    const session = await authenticate(request.body);
    writeSessionCookies(response, session);
    response.json({ data: { user: session.user } });
  } catch (error) {
    next(error);
  }
}

export async function refresh(request: Request, response: Response, next: NextFunction) {
  try {
    const session = await refreshSession(request.cookies?.refreshToken as string | undefined);
    writeSessionCookies(response, session);
    response.json({ data: { user: session.user } });
  } catch (error) {
    next(error);
  }
}

export async function me(request: Request, response: Response, next: NextFunction) {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      return response.json({ data: { user: null } });
    }

    response.json({ data: { user: await currentUser(auth.userId) } });
  } catch (error) {
    next(error);
  }
}

export async function logout(request: Request, response: Response, next: NextFunction) {
  try {
    const auth = (request as AuthenticatedRequest).auth;
    if (auth) {
      await revokeSession(auth.userId);
    } else {
      await revokeSessionFromRefreshToken(request.cookies?.refreshToken as string | undefined);
    }
  } catch (error) {
    return next(error);
  }
  const options = { path: '/' };
  response.clearCookie('accessToken', options);
  response.clearCookie('refreshToken', options);
  response.status(204).send();
}

export async function forgotPassword(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await requestPasswordReset(request.body) });
  } catch (error) {
    next(error);
  }
}

export async function confirmPasswordReset(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await resetPassword(request.body) });
  } catch (error) {
    next(error);
  }
}
