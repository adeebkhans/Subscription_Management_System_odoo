import type { Prisma } from '@prisma/client';
import { paginationArgs, paginationResponse } from '../../core/http/pagination.js';
import { roundCurrency } from '../subscriptions/pricing.js';
import { invoiceView } from '../invoices/invoice.services.js';
import {
  countActiveSubscriptions,
  aggregateReportInvoices,
  findOverdueInvoices,
  sumCollectedPayments
} from './report.repository.js';
import type { FinanceReportQuery, OverdueInvoiceQuery } from './report.types.js';
import { financeReportQuerySchema, overdueInvoiceQuerySchema } from './report.validators.js';

function dateRange(from?: Date, to?: Date) {
  return from || to
    ? {
        gte: from,
        lte: to
      }
    : undefined;
}

function invoiceFilters(query: FinanceReportQuery): Prisma.InvoiceWhereInput {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.planId ? { subscription: { planId: query.planId } } : {}),
    ...(query.from || query.to ? { issueDate: dateRange(query.from, query.to) } : {})
  };
}

function subscriptionFilters(query: FinanceReportQuery): Prisma.SubscriptionWhereInput {
  return {
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.planId ? { planId: query.planId } : {})
  };
}

export function calculateBalanceDue(invoice: {
  total: Prisma.Decimal | number;
  amountPaid: Prisma.Decimal | number;
}) {
  return roundCurrency(Math.max(0, Number(invoice.total) - Number(invoice.amountPaid)));
}

export async function getFinanceReport(input: unknown) {
  const parsed = financeReportQuerySchema.parse(input) as FinanceReportQuery;
  const query = { ...parsed, asOf: parsed.asOf ?? new Date() };
  const invoiceWhere = invoiceFilters(query);
  const subscriptionWhere = subscriptionFilters(query);
  const confirmedWhere: Prisma.InvoiceWhereInput = {
    ...invoiceWhere,
    status: 'CONFIRMED'
  };
  const paidWhere: Prisma.PaymentWhereInput = {
    paidAt: dateRange(query.from, query.to),
    invoice: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.planId ? { subscription: { planId: query.planId } } : {})
    }
  };
  const overdueWhere: Prisma.InvoiceWhereInput = {
    ...confirmedWhere,
    dueDate: {
      lt: query.asOf,
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {})
    }
  };

  const [activeSubscriptions, outstandingInvoices, overdueInvoices, collected] = await Promise.all([
    countActiveSubscriptions(subscriptionWhere),
    aggregateReportInvoices(confirmedWhere),
    aggregateReportInvoices(overdueWhere),
    sumCollectedPayments(paidWhere)
  ]);

  const outstandingRevenue = calculateBalanceDue({
    total: outstandingInvoices._sum.total ?? 0,
    amountPaid: outstandingInvoices._sum.amountPaid ?? 0
  });
  const overdueAmount = calculateBalanceDue({
    total: overdueInvoices._sum.total ?? 0,
    amountPaid: overdueInvoices._sum.amountPaid ?? 0
  });

  return {
    asOf: query.asOf,
    filters: {
      from: query.from ?? null,
      to: query.to ?? null,
      customerId: query.customerId ?? null,
      planId: query.planId ?? null,
      status: query.status ?? null
    },
    activeSubscriptions,
    collectedRevenue: roundCurrency(Number(collected._sum.amount ?? 0)),
    outstandingRevenue,
    overdueInvoices: overdueInvoices._count._all,
    overdueAmount,
    outstandingInvoiceCount: outstandingInvoices._count._all
  };
}

export async function getOverdueInvoices(input: unknown) {
  const parsed = overdueInvoiceQuerySchema.parse(input) as OverdueInvoiceQuery;
  const query = { ...parsed, asOf: parsed.asOf ?? new Date() };
  const search = query.search?.trim();
  const where: Prisma.InvoiceWhereInput = {
    ...(query.status ? { status: query.status } : { status: 'CONFIRMED' }),
    dueDate: {
      lt: query.asOf,
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {})
    },
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.planId ? { subscription: { planId: query.planId } } : {}),
    ...(search
      ? {
          OR: [
            { number: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerEmail: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {})
  };
  const { skip, take } = paginationArgs(query);
  const [items, total] = await findOverdueInvoices(where, skip, take);
  return paginationResponse(
    items.map((invoice) => ({ ...invoiceView(invoice), balanceDue: calculateBalanceDue(invoice) })),
    total,
    query
  );
}
