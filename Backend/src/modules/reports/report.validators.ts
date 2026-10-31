import { z } from 'zod';
import { paginationSchema } from '../../core/http/pagination.js';

const dateFilters = {
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  asOf: z.coerce.date().optional(),
  customerId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED']).optional()
};

export const financeReportQuerySchema = z.object(dateFilters).refine(
  (input) => !input.from || !input.to || input.to >= input.from,
  { message: 'Report period end cannot be before period start', path: ['to'] }
);

export const overdueInvoiceQuerySchema = paginationSchema.extend({
  ...dateFilters,
  search: z.string().trim().optional(),
  status: z.enum(['CONFIRMED', 'PAID']).optional()
}).refine(
  (input) => !input.from || !input.to || input.to >= input.from,
  { message: 'Report period end cannot be before period start', path: ['to'] }
);
