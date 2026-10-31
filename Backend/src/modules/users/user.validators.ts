import { z } from 'zod';
import { paginationSchema } from '../../core/http/pagination.js';
import { staffValidator } from '../auth/auth.validators.js';

export const userListQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  role: z.enum(['ADMIN', 'STAFF', 'CUSTOMER']).optional(),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional()
});

export const userUpdateValidator = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().email().optional(),
    isActive: z.boolean().optional()
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field must be updated'
  });

export const createStaffValidator = staffValidator;
