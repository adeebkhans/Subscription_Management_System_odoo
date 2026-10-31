import { z } from 'zod';
import { paginationSchema } from '../../core/http/pagination.js';

export const portalSubscriptionListQuerySchema = paginationSchema.extend({
  status: z.enum(['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED', 'CANCELLED']).optional()
});

export const portalInvoiceListQuerySchema = paginationSchema.extend({
  status: z.enum(['DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED']).optional()
});
