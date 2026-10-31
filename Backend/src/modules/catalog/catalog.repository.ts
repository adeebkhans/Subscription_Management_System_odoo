import type { Prisma } from '@prisma/client';
import { database } from '../../core/database/prisma.js';

const productDetail = {
  variants: { orderBy: { createdAt: 'asc' as const } }
} satisfies Prisma.ProductInclude;

export function findProducts(where: Prisma.ProductWhereInput, skip: number, take: number) {
  return database.$transaction([
    database.product.findMany({
      where,
      include: productDetail,
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    database.product.count({ where })
  ]);
}

export function findProductById(id: string) {
  return database.product.findUnique({ where: { id }, include: productDetail });
}

export function insertProduct(data: Prisma.ProductCreateInput) {
  return database.product.create({ data, include: productDetail });
}

export function updateProduct(id: string, data: Prisma.ProductUpdateInput) {
  return database.product.update({ where: { id }, data, include: productDetail });
}

export function replaceProductVariants(productId: string, variants: Prisma.ProductVariantCreateWithoutProductInput[]) {
  return database.$transaction(async (tx) => {
    await tx.productVariant.deleteMany({ where: { productId } });
    if (variants.length > 0) {
      await tx.productVariant.createMany({
        data: variants.map((variant) => ({ ...variant, productId }))
      });
    }
  });
}

export function findPlans(where: Prisma.PlanWhereInput, skip: number, take: number) {
  return database.$transaction([
    database.plan.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    database.plan.count({ where })
  ]);
}

export function findPlanById(id: string) {
  return database.plan.findUnique({ where: { id } });
}

export function insertPlan(data: Prisma.PlanCreateInput) {
  return database.plan.create({ data });
}

export function updatePlan(id: string, data: Prisma.PlanUpdateInput) {
  return database.plan.update({ where: { id }, data });
}

export function countActiveSubscriptionsForPlan(planId: string) {
  return database.subscription.count({
    where: { planId, status: { in: ['CONFIRMED', 'ACTIVE', 'PAUSED'] } }
  });
}
