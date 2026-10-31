import type { User } from '@prisma/client';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { issueAccessToken, issueRefreshToken, verifyRefreshToken } from '../../core/auth/tokens.js';
import { ApiError } from '../../core/errors/ApiError.js';
import { sendMail } from '../../core/mail/mailer.js';
import {
  applyPasswordReset,
  createUser,
  findUserByEmail,
  findUserById,
  findUserByResetToken,
  markLogin,
  storeResetToken
} from './auth.repository.js';
import type { PasswordResetRequestResult, SessionResult } from './auth.types.js';
import {
  forgotPasswordValidator,
  loginValidator,
  resetPasswordValidator,
  signupValidator,
  staffValidator
} from './auth.validators.js';

const resetTokenLifetimeMs = 60 * 60 * 1000;

function toSession(user: User): SessionResult {
  const payload = { userId: user.id, role: user.role };
  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    accessToken: issueAccessToken(payload),
    refreshToken: issueRefreshToken(payload)
  };
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function registerCustomer(input: unknown) {
  const data = signupValidator.parse(input);
  const email = data.email.toLowerCase();

  if (await findUserByEmail(email)) {
    throw new ApiError('Email is already registered', 409, 'EMAIL_EXISTS');
  }

  const user = await createUser({
    email,
    name: data.name,
    passwordHash: await argon2.hash(data.password),
    role: 'CUSTOMER'
  });

  return toSession(user);
}

export async function authenticate(input: unknown) {
  const data = loginValidator.parse(input);
  const user = await findUserByEmail(data.email.toLowerCase());

  if (!user || !(await argon2.verify(user.passwordHash, data.password))) {
    throw new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new ApiError('Account is inactive', 403, 'ACCOUNT_INACTIVE');
  }

  await markLogin(user.id);
  return toSession(user);
}

export async function registerStaff(input: unknown) {
  const data = staffValidator.parse(input);
  const email = data.email.toLowerCase();

  if (await findUserByEmail(email)) {
    throw new ApiError('Email is already registered', 409, 'EMAIL_EXISTS');
  }

  const user = await createUser({
    email,
    name: data.name,
    passwordHash: await argon2.hash(data.password),
    role: data.role
  });

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function currentUser(userId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
  }

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function refreshSession(refreshToken?: string) {
  if (!refreshToken) {
    throw new ApiError('Refresh token is required', 401, 'REFRESH_TOKEN_REQUIRED');
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const user = await findUserById(payload.userId);
  if (!user || !user.isActive) {
    throw new ApiError('Account is unavailable', 401, 'ACCOUNT_UNAVAILABLE');
  }

  return toSession(user);
}

export async function requestPasswordReset(input: unknown): Promise<PasswordResetRequestResult> {
  const data = forgotPasswordValidator.parse(input);
  const user = await findUserByEmail(data.email.toLowerCase());
  const message = 'If the email is registered, a password reset link has been sent.';

  if (!user) {
    return { message };
  }

  const token = randomBytes(32).toString('hex');
  await storeResetToken(user.id, hashToken(token), new Date(Date.now() + resetTokenLifetimeMs));

  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your Brightloop password',
    text: `Open this link to reset your password: ${resetUrl}`
  });

  return env.NODE_ENV === 'production' ? { message } : { message, resetToken: token };
}

export async function resetPassword(input: unknown) {
  const data = resetPasswordValidator.parse(input);
  const user = await findUserByResetToken(hashToken(data.token));

  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt.getTime() < Date.now()) {
    throw new ApiError('Reset link is invalid or has expired', 400, 'RESET_TOKEN_INVALID');
  }

  await applyPasswordReset(user.id, await argon2.hash(data.password));
  return { message: 'Password has been reset. You can now sign in.' };
}
