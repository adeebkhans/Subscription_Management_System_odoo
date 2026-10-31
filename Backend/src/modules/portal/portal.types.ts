import type { InvoiceStatus, SubscriptionStatus } from '@prisma/client';

export type PortalSubscriptionListQuery = {
  page: number;
  pageSize: number;
  status?: SubscriptionStatus;
};

export type PortalInvoiceListQuery = {
  page: number;
  pageSize: number;
  status?: InvoiceStatus;
};
