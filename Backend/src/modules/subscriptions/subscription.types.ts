import type { SubscriptionStatus } from '@prisma/client';
import type { SubscriptionAction } from './lifecycle.js';

export type SubscriptionLineInput = {
  productId: string;
  variantId?: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
  taxRate: number;
};

export type SubscriptionInput = {
  customerId: string;
  planId?: string;
  quotationTemplateId?: string;
  startDate: Date;
  expiryDate?: Date;
  paymentTermId?: string;
  notes?: string;
  lines?: SubscriptionLineInput[];
};

export type SubscriptionUpdateInput = {
  startDate?: Date;
  expiryDate?: Date | null;
  paymentTermId?: string | null;
  notes?: string | null;
  lines?: SubscriptionLineInput[];
};

export type SubscriptionListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: SubscriptionStatus;
  customerId?: string;
  planId?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
};

export type TransitionInput = {
  action: SubscriptionAction;
  reason?: string;
};

export type RenewInput = {
  startDate?: Date;
  expiryDate?: Date;
};

export type ResolvedLine = {
  productId: string;
  variantId?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};
