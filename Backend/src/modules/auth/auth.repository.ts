import type { Prisma } from '@prisma/client';
import { database } from '../../core/database/prisma.js';

export function findUserByEmail(email: string) {
  return database.user.findUnique({ where: { email } });
}

export function findUserById(id: string) {
  return database.user.findUnique({ where: { id } });
}

export function createUser(data: Prisma.UserCreateInput) {
  return database.user.create({ data });
}

export function markLogin(id: string) {
  return database.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
}

export function storeResetToken(id: string, resetTokenHash: string, resetTokenExpiresAt: Date) {
  return database.user.update({
    where: { id },
    data: { resetTokenHash, resetTokenExpiresAt }
  });
}

export function findUserByResetToken(resetTokenHash: string) {
  return database.user.findFirst({ where: { resetTokenHash } });
}

export function applyPasswordReset(id: string, passwordHash: string) {
  return database.user.update({
    where: { id },
    data: { passwordHash, resetTokenHash: null, resetTokenExpiresAt: null }
  });
}
