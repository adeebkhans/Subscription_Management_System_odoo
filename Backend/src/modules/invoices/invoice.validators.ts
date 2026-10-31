import { z } from 'zod';
import { paginationSchema } from '../../core/http/pagination.js';

export const invoiceListQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED']).optional(),
  customerId: z.string().uuid().optional(),
  subscriptionId: z.string().uuid().optional(),
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional()
}).refine((input) => !input.dueDateFrom || !input.dueDateTo || input.dueDateTo >= input.dueDateFrom, {
  message: 'Due date end cannot be before due date start',
  path: ['dueDateTo']
});

export const generateInvoiceValidator = z.object({
  subscriptionId: z.string().uuid(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  issueDate: z.coerce.date().optional()
}).refine((input) => !input.periodStart || !input.periodEnd || input.periodEnd > input.periodStart, {
  message: 'Invoice period end must be after period start',
  path: ['periodEnd']
});

export const invoiceActionValidator = z.object({
  action: z.enum(['CONFIRM', 'CANCEL', 'SEND', 'PRINT']),
  reason: z.string().trim().max(500).optional()
});

export const billingRunValidator = z.object({
  asOf: z.coerce.date().optional()
});

export const paymentValidator = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER']),
  paidAt: z.coerce.date().default(() => new Date()),
  note: z.string().trim().max(1000).optional(),
  reference: z.string().trim().max(200).optional()
});
