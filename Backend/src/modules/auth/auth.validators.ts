import { z } from 'zod';

export const signupValidator = z.object({
  email: z.string().email(),
  password: z.string().min(9).regex(/[a-z]/).regex(/[A-Z]/).regex(/[^A-Za-z0-9]/),
  name: z.string().trim().min(2).max(100)
});

export const loginValidator = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const staffValidator = signupValidator.extend({
  role: z.enum(['ADMIN', 'STAFF']).default('STAFF')
});
