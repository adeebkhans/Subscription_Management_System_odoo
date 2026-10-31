import { z } from 'zod';

export const productValidator = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(['GOODS', 'SERVICE']),
  salesPrice: z.number().nonnegative(),
  costPrice: z.number().nonnegative(),
  notes: z.string().max(5000).optional(),
  variants: z.array(z.object({
    attribute: z.string().trim().min(1).max(100),
    value: z.string().trim().min(1).max(100),
    extraPrice: z.number().nonnegative()
  })).default([])
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
  allowRenew: z.boolean().default(true)
}).refine((value) => !value.availableUntil || !value.availableFrom || value.availableUntil >= value.availableFrom, {
  message: 'Available until cannot be before available from',
  path: ['availableUntil']
});
