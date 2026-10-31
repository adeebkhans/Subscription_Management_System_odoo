import { z } from 'zod';
import { paginationSchema } from '../../core/http/pagination.js';

export const paymentTermListQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional()
});

export const paymentTermValidator = z.object({
  name: z.string().trim().min(2).max(120),
  dueDays: z.number().int().min(0).max(365).default(0),
  isActive: z.boolean().default(true)
});

export const paymentTermUpdateValidator = paymentTermValidator
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field must be updated'
  });
