import type { InvoiceStatus, PaymentMethod, Prisma } from '@prisma/client';

export type InvoiceListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: InvoiceStatus;
  customerId?: string;
  subscriptionId?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
};

export type GenerateInvoiceInput = {
  subscriptionId: string;
  periodStart?: Date;
  periodEnd?: Date;
  issueDate?: Date;
};

export type InvoiceActionInput = {
  action: 'CONFIRM' | 'CANCEL' | 'SEND' | 'PRINT';
  reason?: string;
};

export type PaymentInput = {
  amount: number;
  method: PaymentMethod;
  paidAt: Date;
  note?: string;
  reference?: string;
};

export type InvoiceWhereInput = Prisma.InvoiceWhereInput;
