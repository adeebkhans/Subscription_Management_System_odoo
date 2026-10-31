import type { Prisma } from '@prisma/client';
import { database } from '../../core/database/prisma.js';

export function listActiveProducts() {
  return database.product.findMany({ where: { isActive: true }, include: { variants: true } });
}

export function listActivePlans() {
  return database.plan.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
}

export function createProduct(data: Prisma.ProductCreateInput) {
  return database.product.create({ data, include: { variants: true } });
}

export function createPlan(data: Prisma.PlanCreateInput) {
  return database.plan.create({ data });
}
