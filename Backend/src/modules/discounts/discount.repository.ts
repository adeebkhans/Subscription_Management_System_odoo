import { Prisma } from '@prisma/client';
import { database } from '../../core/database/prisma.js';

export const discountRuleInclude = {
  product: { select: { id: true, name: true, isActive: true } },
  createdBy: { select: { id: true, name: true, email: true } }
} satisfies Prisma.DiscountRuleInclude;

export type DiscountRuleWithRelations = Prisma.DiscountRuleGetPayload<{
  include: typeof discountRuleInclude;
}>;

export function findDiscountRules(where: Prisma.DiscountRuleWhereInput, skip: number, take: number) {
  return database.$transaction([
    database.discountRule.findMany({
      where,
      include: discountRuleInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    database.discountRule.count({ where })
  ]);
}

export function findDiscountRuleById(id: string) {
  return database.discountRule.findUnique({ where: { id }, include: discountRuleInclude });
}

export function findEligibleDiscountRules(productIds: string[], asOf: Date) {
  return database.discountRule.findMany({
    where: {
      isActive: true,
      OR: [
        { scope: 'SUBSCRIPTION' },
        { scope: 'PRODUCT', productId: { in: productIds } }
      ],
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: asOf } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: asOf } }] }
      ],
    },
    orderBy: [{ value: 'desc' }, { createdAt: 'asc' }]
  });
}

export function findProductById(id: string) {
  return database.product.findUnique({ where: { id }, select: { id: true, name: true, isActive: true } });
}

export function insertDiscountRule(data: Prisma.DiscountRuleCreateInput) {
  return database.discountRule.create({ data, include: discountRuleInclude });
}

export function updateDiscountRule(id: string, data: Prisma.DiscountRuleUpdateInput) {
  return database.discountRule.update({ where: { id }, data, include: discountRuleInclude });
}

export async function reserveDiscountUsage(tx: Prisma.TransactionClient, id: string) {
  const rows = await tx.$queryRaw<Array<{ is_active: boolean; usage_count: number; max_usage_count: number | null }>>(
    Prisma.sql`SELECT "is_active", "usage_count", "max_usage_count"
      FROM "discount_rules" WHERE "id" = ${id}::uuid FOR UPDATE`
  );
  const rule = rows[0];
  if (
    !rule ||
    !rule.is_active ||
    (rule.max_usage_count !== null && rule.usage_count >= rule.max_usage_count)
  ) {
    return false;
  }

  await tx.discountRule.update({
    where: { id },
    data: { usageCount: { increment: 1 } }
  });
  return true;
}
