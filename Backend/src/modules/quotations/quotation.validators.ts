import { z } from 'zod';
import { paginationSchema } from '../../core/http/pagination.js';

export const quotationLineValidator = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().nonnegative().optional(),
  taxRate: z.number().min(0).max(100).default(0),
  sortOrder: z.number().int().min(0).default(0)
});

export const quotationValidator = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(4000).optional(),
  validityDays: z.number().int().min(1).max(365),
  planId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  lines: z.array(quotationLineValidator).min(1, 'Add at least one product line')
});

export const quotationUpdateValidator = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().max(4000).nullable().optional(),
    validityDays: z.number().int().min(1).max(365).optional(),
    planId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
    lines: z.array(quotationLineValidator).min(1).optional()
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field must be updated'
  });

export const quotationListQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional()
});
