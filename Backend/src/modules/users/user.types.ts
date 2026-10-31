import type { UserRole } from '@prisma/client';

export type UserListItem = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
};
