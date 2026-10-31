import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(9, 'Password must be longer than eight characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

export const signupValidator = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().trim().min(2).max(100)
});

export const loginValidator = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const staffValidator = signupValidator.extend({
  role: z.enum(['ADMIN', 'STAFF']).default('STAFF')
});

export const forgotPasswordValidator = z.object({
  email: z.string().email()
});

export const resetPasswordValidator = z
  .object({
    token: z.string().min(20),
    password: passwordSchema,
    confirmPassword: z.string().min(1)
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });
