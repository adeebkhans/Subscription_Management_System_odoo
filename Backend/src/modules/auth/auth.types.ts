import type { UserRole } from '@prisma/client';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type SessionResult = {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
};
