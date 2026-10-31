import type { Prisma, UserRole } from '@prisma/client';

export type UserSummary = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export type UserListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
};

export type UserUpdateInput = {
  name?: string;
  email?: string;
  isActive?: boolean;
};

export type UserWhereInput = Prisma.UserWhereInput;
