import { database } from '../../core/database/prisma.js';

export function listUsers() {
  return database.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
}
