import type { InvoiceStatus, Prisma, SubscriptionStatus } from '@prisma/client';

export type FinanceReportQuery = {
  from?: Date;
  to?: Date;
  asOf: Date;
  customerId?: string;
  planId?: string;
  status?: InvoiceStatus;
};

export type OverdueInvoiceQuery = FinanceReportQuery & {
  page: number;
  pageSize: number;
  search?: string;
  status?: InvoiceStatus;
};

export type ReportInvoiceWhereInput = Prisma.InvoiceWhereInput;
export type ReportSubscriptionStatus = SubscriptionStatus;
