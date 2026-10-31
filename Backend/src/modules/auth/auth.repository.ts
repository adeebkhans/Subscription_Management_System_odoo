import type { Prisma, User } from '@prisma/client';
import { database } from '../../core/database/prisma.js';

export function findUserByEmail(email: string) {
  return database.user.findUnique({ where: { email } });
}

export function createUser(data: Prisma.UserCreateInput) {
  return database.user.create({ data });
}
