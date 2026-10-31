import type { Prisma } from '@prisma/client';
import { database } from '../../core/database/prisma.js';

const userSummarySelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true
} satisfies Prisma.UserSelect;

export function listUsers(where: Prisma.UserWhereInput, skip: number, take: number) {
  return database.$transaction([
    database.user.findMany({ where, select: userSummarySelect, orderBy: { createdAt: 'desc' }, skip, take }),
    database.user.count({ where })
  ]);
}

export function findUserSummary(id: string) {
  return database.user.findUnique({ where: { id }, select: userSummarySelect });
}

export function updateUser(id: string, data: Prisma.UserUpdateInput) {
  return database.user.update({ where: { id }, data, select: userSummarySelect });
}
