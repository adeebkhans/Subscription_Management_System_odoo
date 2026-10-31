import { Prisma, type Prisma as PrismaTypes } from '@prisma/client';
import { database } from '../../core/database/prisma.js';

export const invoiceInclude = {
  subscription: {
    select: {
      id: true,
      number: true,
      status: true,
      plan: { select: { id: true, name: true, frequency: true } }
    }
  },
  customer: { select: { id: true, name: true, email: true } },
  lines: {
    include: {
      product: { select: { id: true, name: true } },
      variant: { select: { id: true, attribute: true, value: true } }
    },
    orderBy: { sortOrder: 'asc' as const }
  },
  discounts: { orderBy: { createdAt: 'asc' as const } },
  payments: { orderBy: { paidAt: 'asc' as const } }
} satisfies PrismaTypes.InvoiceInclude;

export type InvoiceWithRelations = PrismaTypes.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

export const billableSubscriptionInclude = {
  customer: { select: { id: true, name: true, email: true } },
  plan: true,
  paymentTerm: true,
  lines: {
    include: { product: true, variant: true },
    orderBy: { sortOrder: 'asc' as const }
  },
  invoices: { orderBy: { periodEnd: 'desc' as const } }
} satisfies PrismaTypes.SubscriptionInclude;

export type BillableSubscription = PrismaTypes.SubscriptionGetPayload<{
  include: typeof billableSubscriptionInclude;
}>;

export function findInvoices(where: PrismaTypes.InvoiceWhereInput, skip: number, take: number) {
  return database.$transaction([
    database.invoice.findMany({
      where,
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    database.invoice.count({ where })
  ]);
}

export function findInvoiceById(id: string) {
  return database.invoice.findUnique({ where: { id }, include: invoiceInclude });
}

export function findInvoiceByBillingKey(billingKey: string) {
  return database.invoice.findUnique({ where: { billingKey }, include: invoiceInclude });
}

export function findBillableSubscription(id: string) {
  return database.subscription.findUnique({
    where: { id },
    include: billableSubscriptionInclude
  });
}

export function findBillableSubscriptions(asOf: Date) {
  return database.subscription.findMany({
    where: {
      status: 'ACTIVE',
      startDate: { lte: asOf },
      OR: [{ expiryDate: null }, { expiryDate: { gte: asOf } }]
    },
    include: billableSubscriptionInclude
  });
}

export function nextInvoiceNumber(tx: PrismaTypes.TransactionClient, year: number) {
  return tx.sequence.upsert({
    where: { key: `invoice:${year}` },
    update: { value: { increment: 1 } },
    create: { key: `invoice:${year}`, value: 1 }
  });
}

export function createInvoiceWithNumber(
  build: (number: string, tx: PrismaTypes.TransactionClient) => PrismaTypes.InvoiceCreateInput,
  year: number,
  beforeCreate?: (tx: PrismaTypes.TransactionClient) => Promise<void>
) {
  return database.$transaction(async (tx) => {
    const sequence = await nextInvoiceNumber(tx, year);
    const number = `INV-${year}-${String(sequence.value).padStart(6, '0')}`;
    if (beforeCreate) {
      await beforeCreate(tx);
    }
    return tx.invoice.create({ data: build(number, tx), include: invoiceInclude });
  });
}

export function updateInvoice(id: string, data: PrismaTypes.InvoiceUpdateInput) {
  return database.invoice.update({ where: { id }, data, include: invoiceInclude });
}

export function recordPayment(
  invoiceId: string,
  data: PrismaTypes.PaymentCreateWithoutInvoiceInput,
  paidAt: Date
) {
  return database.$transaction(async (tx) => {
    const lockedInvoices = await tx.$queryRaw<Array<{ total: PrismaTypes.Decimal; status: string }>>(
      Prisma.sql`SELECT "total", "status" FROM "invoices" WHERE "id" = ${invoiceId}::uuid FOR UPDATE`
    );
    const invoice = lockedInvoices[0];
    if (!invoice) {
      return null;
    }
    if (invoice.status !== 'CONFIRMED') {
      return { notPayable: true as const, status: invoice.status };
    }

    const payments = await tx.payment.aggregate({
      where: { invoiceId },
      _sum: { amount: true }
    });
    const amountPaid = Number(payments._sum.amount ?? 0);
    const remaining = Number(invoice.total) - amountPaid;
    if (Number(data.amount) > remaining + 0.000001) {
      return { overpayment: true as const, remaining, notPayable: false as const };
    }

    const payment = await tx.payment.create({
      data: { ...data, invoice: { connect: { id: invoiceId } } }
    });
    const nextAmountPaid = amountPaid + Number(data.amount);
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: nextAmountPaid,
        ...(nextAmountPaid >= Number(invoice.total) - 0.000001
          ? { status: 'PAID', paidAt }
          : {})
      }
    });

    return { payment, overpayment: false as const, notPayable: false as const };
  });
}
