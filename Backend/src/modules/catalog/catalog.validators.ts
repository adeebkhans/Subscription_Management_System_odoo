import { z } from 'zod';
import { paginationSchema } from '../../core/http/pagination.js';

export const productListQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  type: z.enum(['GOODS', 'SERVICE']).optional(),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional()
});

export const planListQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional()
});

export const variantValidator = z.object({
  attribute: z.string().trim().min(1).max(100),
  value: z.string().trim().min(1).max(100),
  extraPrice: z.number().nonnegative().default(0),
  isActive: z.boolean().default(true)
});

export const productValidator = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(['GOODS', 'SERVICE']),
  salesPrice: z.number().nonnegative(),
  costPrice: z.number().nonnegative(),
  notes: z.string().max(5000).optional(),
  isActive: z.boolean().default(true),
  variants: z.array(variantValidator).max(50).default([])
}).superRefine((input, context) => {
  const keys = new Set<string>();
  input.variants.forEach((variant, index) => {
    const key = `${variant.attribute.toLowerCase()}|${variant.value.toLowerCase()}`;
    if (keys.has(key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate attribute and value combination',
        path: ['variants', index]
      });
    }
    keys.add(key);
  });
});

export const productUpdateValidator = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    type: z.enum(['GOODS', 'SERVICE']).optional(),
    salesPrice: z.number().nonnegative().optional(),
    costPrice: z.number().nonnegative().optional(),
    notes: z.string().max(5000).nullable().optional(),
    isActive: z.boolean().optional(),
    variants: z.array(variantValidator).max(50).optional()
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field must be updated'
  });

export const planValidator = z.object({
  name: z.string().trim().min(2).max(120),
  price: z.number().nonnegative(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  minimumQuantity: z.number().int().min(1).default(1),
  availableFrom: z.coerce.date().optional(),
  availableUntil: z.coerce.date().optional(),
  autoClose: z.boolean().default(false),
  allowEarlyClose: z.boolean().default(true),
  allowPause: z.boolean().default(true),
  allowRenew: z.boolean().default(true),
  isActive: z.boolean().default(true)
}).refine((input) => !input.availableUntil || !input.availableFrom || input.availableUntil >= input.availableFrom, {
  message: 'Available until cannot be before available from',
  path: ['availableUntil']
});

export const planUpdateValidator = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    price: z.number().nonnegative().optional(),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
    minimumQuantity: z.number().int().min(1).optional(),
    availableFrom: z.coerce.date().nullable().optional(),
    availableUntil: z.coerce.date().nullable().optional(),
    autoClose: z.boolean().optional(),
    allowEarlyClose: z.boolean().optional(),
    allowPause: z.boolean().optional(),
    allowRenew: z.boolean().optional(),
    isActive: z.boolean().optional()
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field must be updated'
  });
