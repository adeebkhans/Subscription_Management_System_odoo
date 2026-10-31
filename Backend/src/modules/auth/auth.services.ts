import argon2 from 'argon2';
import type { User } from '@prisma/client';
import { ApiError } from '../../core/errors/ApiError.js';
import { issueAccessToken, issueRefreshToken } from '../../core/auth/tokens.js';
import { createUser, findUserByEmail } from './auth.repository.js';
import { loginValidator, signupValidator, staffValidator } from './auth.validators.js';
import type { SessionResult, SessionUser } from './auth.types.js';

function toSession(user: User): SessionResult {
  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
  const payload = { userId: user.id, role: user.role };
  return {
    user: sessionUser,
    accessToken: issueAccessToken(payload),
    refreshToken: issueRefreshToken(payload)
  };
}

export async function registerCustomer(input: unknown) {
  const data = signupValidator.parse(input);
  const email = data.email.toLowerCase();
  if (await findUserByEmail(email)) {
    throw new ApiError('Email is already registered', 409, 'EMAIL_EXISTS');
  }
  return toSession(await createUser({
    email,
    name: data.name,
    passwordHash: await argon2.hash(data.password),
    role: 'CUSTOMER'
  }));
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
