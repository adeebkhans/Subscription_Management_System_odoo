import { Prisma } from '@prisma/client';
import { createPlan, createProduct, listActivePlans, listActiveProducts } from './catalog.repository.js';
import { planValidator, productValidator } from './catalog.validators.js';
import type { ProductInput, PlanInput } from './catalog.types.js';

export function getProducts() {
  return listActiveProducts();
}

export function getPlans() {
  return listActivePlans();
}

export async function addProduct(input: unknown, createdById: string) {
  const data = productValidator.parse(input) as ProductInput;
  return createProduct({
    name: data.name,
    type: data.type,
    salesPrice: new Prisma.Decimal(data.salesPrice),
    costPrice: new Prisma.Decimal(data.costPrice),
    notes: data.notes,
    createdBy: { connect: { id: createdById } },
    variants: {
      create: data.variants.map((variant) => ({
        attribute: variant.attribute,
        value: variant.value,
        extraPrice: new Prisma.Decimal(variant.extraPrice)
      }))
    }
  });
}

export async function addPlan(input: unknown) {
  const data = planValidator.parse(input) as PlanInput;
  return createPlan({
    name: data.name,
    price: new Prisma.Decimal(data.price),
    frequency: data.frequency,
    minimumQuantity: data.minimumQuantity,
    availableFrom: data.availableFrom,
    availableUntil: data.availableUntil,
    autoClose: data.autoClose,
    allowEarlyClose: data.allowEarlyClose,
    allowPause: data.allowPause,
    allowRenew: data.allowRenew
  });
}
