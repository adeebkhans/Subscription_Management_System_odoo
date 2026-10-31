import type { Prisma } from '@prisma/client';
import { ApiError } from '../../core/errors/ApiError.js';
import { paginationArgs, paginationResponse } from '../../core/http/pagination.js';
import { invoiceView } from '../invoices/invoice.services.js';
import {
  findCustomerInvoice,
  findCustomerInvoices,
  findCustomerSubscription,
  findCustomerSubscriptions
} from './portal.repository.js';
import type { PortalInvoiceListQuery, PortalSubscriptionListQuery } from './portal.types.js';
import {
  portalInvoiceListQuerySchema,
  portalSubscriptionListQuerySchema
} from './portal.validators.js';

export async function getPortalSubscriptions(customerId: string, input: unknown) {
  const query = portalSubscriptionListQuerySchema.parse(input) as PortalSubscriptionListQuery;
  const where: Prisma.SubscriptionWhereInput = query.status ? { status: query.status } : {};
  const { skip, take } = paginationArgs(query);
  const [items, total] = await findCustomerSubscriptions(customerId, where, skip, take);
  return paginationResponse(items, total, query);
}

export async function getPortalInvoices(customerId: string, input: unknown) {
  const query = portalInvoiceListQuerySchema.parse(input) as PortalInvoiceListQuery;
  const where: Prisma.InvoiceWhereInput = query.status ? { status: query.status } : {};
  const { skip, take } = paginationArgs(query);
  const [items, total] = await findCustomerInvoices(customerId, where, skip, take);
  return paginationResponse(items.map(invoiceView), total, query);
}

export async function getPortalSubscription(customerId: string, id: string) {
  const subscription = await findCustomerSubscription(customerId, id);
  if (!subscription) {
    throw new ApiError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
  }
  return subscription;
}

export async function getPortalInvoice(customerId: string, id: string) {
  const invoice = await findCustomerInvoice(customerId, id);
  if (!invoice) {
    throw new ApiError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }
  return invoiceView(invoice);
}
