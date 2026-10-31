import type { Prisma } from '@prisma/client';
import { database } from '../../core/database/prisma.js';
import { invoiceInclude } from '../invoices/invoice.repository.js';

export function countActiveSubscriptions(where: Prisma.SubscriptionWhereInput) {
  return database.subscription.count({
    where: { ...where, status: { in: ['ACTIVE', 'PAUSED'] } }
  });
}

export function aggregateReportInvoices(where: Prisma.InvoiceWhereInput) {
  return database.invoice.aggregate({
    where,
    _count: { _all: true },
    _sum: { total: true, amountPaid: true }
  });
}

export function findOverdueInvoices(
  where: Prisma.InvoiceWhereInput,
  skip: number,
  take: number
) {
  return database.$transaction([
    database.invoice.findMany({
      where,
      include: invoiceInclude,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      skip,
      take
    }),
    database.invoice.count({ where })
  ]);
}

export function sumCollectedPayments(where: Prisma.PaymentWhereInput) {
  return database.payment.aggregate({
    where,
    _sum: { amount: true }
  });
}
