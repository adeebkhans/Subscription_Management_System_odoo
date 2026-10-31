import type { Prisma } from '@prisma/client';
import { database } from '../../core/database/prisma.js';
import { invoiceInclude } from '../invoices/invoice.repository.js';
import { subscriptionInclude } from '../subscriptions/subscription.repository.js';

export function findCustomerSubscriptions(
  customerId: string,
  where: Prisma.SubscriptionWhereInput,
  skip: number,
  take: number
) {
  const scopedWhere = { ...where, customerId };
  return database.$transaction([
    database.subscription.findMany({
      where: scopedWhere,
      include: subscriptionInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    database.subscription.count({ where: scopedWhere })
  ]);
}

export function findCustomerInvoices(
  customerId: string,
  where: Prisma.InvoiceWhereInput,
  skip: number,
  take: number
) {
  const scopedWhere = { ...where, customerId };
  return database.$transaction([
    database.invoice.findMany({
      where: scopedWhere,
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    database.invoice.count({ where: scopedWhere })
  ]);
}

export function findCustomerSubscription(customerId: string, id: string) {
  return database.subscription.findFirst({
    where: { id, customerId },
    include: subscriptionInclude
  });
}

export function findCustomerInvoice(customerId: string, id: string) {
  return database.invoice.findFirst({
    where: { id, customerId },
    include: invoiceInclude
  });
}
