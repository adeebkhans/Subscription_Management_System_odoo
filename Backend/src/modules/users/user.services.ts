import type { Prisma } from '@prisma/client';
import { ApiError } from '../../core/errors/ApiError.js';
import { paginationArgs, paginationResponse } from '../../core/http/pagination.js';
import { registerStaff } from '../auth/auth.services.js';
import { findUserByEmail } from '../auth/auth.repository.js';
import { findUserSummary, listUsers, updateUser } from './user.repository.js';
import type { UserListQuery, UserUpdateInput } from './user.types.js';
import { userListQuerySchema, userUpdateValidator } from './user.validators.js';

export async function getUsers(input: unknown) {
  const query = userListQuerySchema.parse(input) as UserListQuery;
  const search = query.search?.trim();

  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {})
  };

  const { skip, take } = paginationArgs(query);
  const [items, total] = await listUsers(where, skip, take);
  return paginationResponse(items, total, query);
}

export async function getUser(id: string) {
  const user = await findUserSummary(id);
  if (!user) {
    throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
  }

  return user;
}

export async function createStaffAccount(input: unknown) {
  return registerStaff(input);
}

export async function editUser(id: string, input: unknown, actorId: string) {
  const data = userUpdateValidator.parse(input) as UserUpdateInput;
  const existing = await getUser(id);

  if (existing.role === 'ADMIN') {
    throw new ApiError('Admin accounts cannot be modified here', 403, 'ADMIN_LOCKED');
  }

  if (actorId === id && data.isActive === false) {
    throw new ApiError('You cannot disable your own account', 400, 'SELF_DISABLE_BLOCKED');
  }

  if (data.email && data.email.toLowerCase() !== existing.email) {
    const emailTaken = await findUserByEmail(data.email.toLowerCase());
    if (emailTaken) {
      throw new ApiError('Email is already registered', 409, 'EMAIL_EXISTS');
    }
  }

  return updateUser(id, {
    name: data.name,
    email: data.email?.toLowerCase(),
    isActive: data.isActive
  });
}
