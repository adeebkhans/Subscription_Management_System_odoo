import { z } from 'zod';
import { paginationSchema } from '../../core/http/pagination.js';

export const subscriptionLineValidator = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().nonnegative().optional(),
  taxRate: z.number().min(0).max(100).default(0)
});

const subscriptionBaseValidator = z.object({
  customerId: z.string().uuid(),
  planId: z.string().uuid().optional(),
  quotationTemplateId: z.string().uuid().optional(),
  startDate: z.coerce.date(),
  expiryDate: z.coerce.date().optional(),
  paymentTermId: z.string().uuid().optional(),
  notes: z.string().max(4000).optional(),
  lines: z.array(subscriptionLineValidator).optional()
});

export const subscriptionValidator = subscriptionBaseValidator
  .refine((input) => Boolean(input.planId || input.quotationTemplateId), {
    message: 'A plan or quotation template is required',
    path: ['planId']
  })
  .refine((input) => !input.expiryDate || input.expiryDate >= input.startDate, {
    message: 'Expiry date cannot be before the start date',
    path: ['expiryDate']
  });

export const subscriptionUpdateValidator = z
  .object({
    startDate: z.coerce.date().optional(),
    expiryDate: z.coerce.date().nullable().optional(),
    paymentTermId: z.string().uuid().nullable().optional(),
    notes: z.string().max(4000).nullable().optional(),
    lines: z.array(subscriptionLineValidator).min(1).optional()
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field must be updated'
  });

export const subscriptionListQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED', 'CANCELLED']).optional(),
  customerId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  startDateFrom: z.coerce.date().optional(),
  startDateTo: z.coerce.date().optional()
});

export const transitionValidator = z.object({
  action: z.enum(['SUBMIT', 'CONFIRM', 'ACTIVATE', 'PAUSE', 'RESUME', 'CLOSE', 'CANCEL']),
  reason: z.string().max(500).optional()
});

export const renewValidator = z.object({
  startDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional()
});
