import type { Prisma } from '@prisma/client';
import { database } from '../../core/database/prisma.js';

export const subscriptionInclude = {
  customer: { select: { id: true, email: true, name: true } },
  plan: true,
  paymentTerm: true,
  quotationTemplate: { select: { id: true, name: true, validityDays: true } },
  lines: {
    include: { product: true, variant: true },
    orderBy: { sortOrder: 'asc' as const }
  }
} satisfies Prisma.SubscriptionInclude;

export type SubscriptionWithRelations = Prisma.SubscriptionGetPayload<{ include: typeof subscriptionInclude }>;

export function findSubscriptions(where: Prisma.SubscriptionWhereInput, skip: number, take: number) {
  return database.$transaction([
    database.subscription.findMany({
      where,
      include: subscriptionInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    database.subscription.count({ where })
  ]);
}

export function findSubscriptionById(id: string) {
  return database.subscription.findUnique({ where: { id }, include: subscriptionInclude });
}

export function findCustomer(id: string) {
  return database.user.findUnique({ where: { id } });
}

export function findPlan(id: string) {
  return database.plan.findUnique({ where: { id } });
}

export function findPaymentTerm(id: string) {
  return database.paymentTerm.findUnique({ where: { id } });
}

export function findQuotationTemplateWithLines(id: string) {
  return database.quotationTemplate.findUnique({
    where: { id },
    include: { lines: { orderBy: { sortOrder: 'asc' } } }
  });
}

export function findLineProducts(productIds: string[]) {
  return database.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true }
  });
}

export function createSubscription(data: Prisma.SubscriptionCreateInput) {
  return database.subscription.create({ data, include: subscriptionInclude });
}

export function updateSubscription(id: string, data: Prisma.SubscriptionUpdateInput) {
  return database.subscription.update({ where: { id }, data, include: subscriptionInclude });
}

export function replaceSubscriptionLines(
  subscriptionId: string,
  lines: Array<Omit<Prisma.SubscriptionLineCreateManyInput, 'subscriptionId'>>
) {
  return database.$transaction(async (tx) => {
    await tx.subscriptionLine.deleteMany({ where: { subscriptionId } });
    if (lines.length > 0) {
      await tx.subscriptionLine.createMany({ data: lines.map((line) => ({ ...line, subscriptionId })) });
    }
  });
}

export function nextSubscriptionNumber(tx: Prisma.TransactionClient, year: number) {
  return tx.sequence.upsert({
    where: { key: `subscription:${year}` },
    update: { value: { increment: 1 } },
    create: { key: `subscription:${year}`, value: 1 }
  });
}

export function createSubscriptionWithNumber(
  build: (number: string) => Prisma.SubscriptionCreateInput,
  year: number
) {
  return database.$transaction(async (tx) => {
    const sequence = await nextSubscriptionNumber(tx, year);
    const number = `SUB-${year}-${String(sequence.value).padStart(6, '0')}`;
    return tx.subscription.create({ data: build(number), include: subscriptionInclude });
  });
}

export function findSubscriptionsDueForAutoClose(now: Date) {
  return database.subscription.findMany({
    where: {
      status: 'ACTIVE',
      expiryDate: { not: null, lte: now },
      plan: { autoClose: true }
    },
    include: { plan: true }
  });
}

export function closeSubscription(id: string, closedAt: Date) {
  return database.subscription.update({ where: { id }, data: { status: 'CLOSED', closedAt } });
}
