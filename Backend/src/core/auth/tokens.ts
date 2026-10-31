import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';

export type TokenPayload = { userId: string; role: 'ADMIN' | 'STAFF' | 'CUSTOMER' };

function ttl(value: string): SignOptions['expiresIn'] {
  return value as SignOptions['expiresIn'];
}

export function issueAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ttl(env.ACCESS_TOKEN_TTL) });
}

export function issueRefreshToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: ttl(env.REFRESH_TOKEN_TTL) });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
}
