import { Prisma } from '@prisma/client';
import { ApiError } from '../../core/errors/ApiError.js';
import { paginationArgs, paginationResponse } from '../../core/http/pagination.js';
import {
  countActiveSubscriptionsForPlan,
  findPlanById,
  findPlans,
  findProductById,
  findProducts,
  insertPlan,
  insertProduct,
  replaceProductVariants,
  updatePlan,
  updateProduct
} from './catalog.repository.js';
import type { PlanInput, PlanUpdateInput, ProductInput, ProductUpdateInput } from './catalog.types.js';
import {
  planListQuerySchema,
  planUpdateValidator,
  planValidator,
  productListQuerySchema,
  productUpdateValidator,
  productValidator
} from './catalog.validators.js';

function productWhere(input: unknown): Prisma.ProductWhereInput {
  const query = productListQuerySchema.parse(input);
  const search = query.search?.trim();

  return {
    ...(query.type ? { type: query.type } : {}),
    ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {})
  };
}

export async function getProducts(input: unknown) {
  const query = productListQuerySchema.parse(input);
  const { skip, take } = paginationArgs(query);
  const [items, total] = await findProducts(productWhere(input), skip, take);
  return paginationResponse(items, total, query);
}

export async function getProduct(id: string) {
  const product = await findProductById(id);
  if (!product) {
    throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  }

  return product;
}

export async function addProduct(input: unknown, createdById: string) {
  const data = productValidator.parse(input) as ProductInput;
  return insertProduct({
    name: data.name,
    type: data.type,
    salesPrice: new Prisma.Decimal(data.salesPrice),
    costPrice: new Prisma.Decimal(data.costPrice),
    notes: data.notes,
    isActive: data.isActive,
    createdBy: { connect: { id: createdById } },
    variants: {
      create: data.variants.map((variant) => ({
        attribute: variant.attribute,
        value: variant.value,
        extraPrice: new Prisma.Decimal(variant.extraPrice),
        isActive: variant.isActive
      }))
    }
  });
}

export async function editProduct(id: string, input: unknown) {
  await getProduct(id);
  const data = productUpdateValidator.parse(input) as ProductUpdateInput;

  const updated = await updateProduct(id, {
    name: data.name,
    type: data.type,
    salesPrice: data.salesPrice === undefined ? undefined : new Prisma.Decimal(data.salesPrice),
    costPrice: data.costPrice === undefined ? undefined : new Prisma.Decimal(data.costPrice),
    notes: data.notes,
    isActive: data.isActive
  });

  if (data.variants) {
    await replaceProductVariants(
      id,
      data.variants.map((variant) => ({
        attribute: variant.attribute,
        value: variant.value,
        extraPrice: new Prisma.Decimal(variant.extraPrice),
        isActive: variant.isActive
      }))
    );
    return getProduct(id);
  }

  return updated;
}

export async function deactivateProduct(id: string) {
  await getProduct(id);
  await updateProduct(id, { isActive: false });
}

function planWhere(input: unknown): Prisma.PlanWhereInput {
  const query = planListQuerySchema.parse(input);
  const search = query.search?.trim();

  return {
    ...(query.frequency ? { frequency: query.frequency } : {}),
    ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {})
  };
}

export async function getPlans(input: unknown) {
  const query = planListQuerySchema.parse(input);
  const { skip, take } = paginationArgs(query);
  const [items, total] = await findPlans(planWhere(input), skip, take);
  return paginationResponse(items, total, query);
}

export async function getPlan(id: string) {
  const plan = await findPlanById(id);
  if (!plan) {
    throw new ApiError('Plan not found', 404, 'PLAN_NOT_FOUND');
  }

  return plan;
}

export async function addPlan(input: unknown, createdById: string) {
  const data = planValidator.parse(input) as PlanInput;
  return insertPlan({
    name: data.name,
    price: new Prisma.Decimal(data.price),
    frequency: data.frequency,
    minimumQuantity: data.minimumQuantity,
    availableFrom: data.availableFrom,
    availableUntil: data.availableUntil,
    autoClose: data.autoClose,
    allowEarlyClose: data.allowEarlyClose,
    allowPause: data.allowPause,
    allowRenew: data.allowRenew,
    isActive: data.isActive,
    createdBy: { connect: { id: createdById } }
  });
}

export async function editPlan(id: string, input: unknown) {
  const existing = await getPlan(id);
  const data = planUpdateValidator.parse(input) as PlanUpdateInput;

  const availableFrom = data.availableFrom === undefined ? undefined : data.availableFrom;
  const availableUntil = data.availableUntil === undefined ? undefined : data.availableUntil;
  const nextFrom = availableFrom === undefined ? existing.availableFrom : availableFrom;
  const nextUntil = availableUntil === undefined ? existing.availableUntil : availableUntil;

  if (nextFrom && nextUntil && nextUntil < nextFrom) {
    throw new ApiError('Available until cannot be before available from', 400, 'INVALID_PLAN_DATES');
  }

  return updatePlan(id, {
    name: data.name,
    price: data.price === undefined ? undefined : new Prisma.Decimal(data.price),
    frequency: data.frequency,
    minimumQuantity: data.minimumQuantity,
    availableFrom,
    availableUntil,
    autoClose: data.autoClose,
    allowEarlyClose: data.allowEarlyClose,
    allowPause: data.allowPause,
    allowRenew: data.allowRenew,
    isActive: data.isActive
  });
}

export async function deactivatePlan(id: string) {
  await getPlan(id);
  const activeSubscriptions = await countActiveSubscriptionsForPlan(id);
  if (activeSubscriptions > 0) {
    throw new ApiError(
      'Plan has subscriptions that are still in progress',
      409,
      'PLAN_IN_USE',
      { activeSubscriptions }
    );
  }

  await updatePlan(id, { isActive: false });
}
