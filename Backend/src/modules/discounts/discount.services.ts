import type { Prisma } from '@prisma/client';
import { ApiError } from '../../core/errors/ApiError.js';
import { paginationArgs, paginationResponse } from '../../core/http/pagination.js';
import {
  findDiscountRuleById,
  findDiscountRules,
  findProductById,
  insertDiscountRule,
  updateDiscountRule
} from './discount.repository.js';
import type {
  DiscountRuleInput,
  DiscountRuleListQuery,
  DiscountRuleUpdateInput
} from './discount.types.js';
import {
  discountRuleListQuerySchema,
  discountRuleUpdateValidator,
  discountRuleValidator
} from './discount.validators.js';

async function validateProduct(productId: string | null | undefined) {
  if (!productId) return;
  const product = await findProductById(productId);
  if (!product) {
    throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  }
  if (!product.isActive) {
    throw new ApiError('Discount target product is inactive', 409, 'PRODUCT_INACTIVE');
  }
}

function validateEffectiveRule(input: {
  type: 'FIXED' | 'PERCENTAGE';
  scope: 'PRODUCT' | 'SUBSCRIPTION';
  value: number;
  productId?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  maxUsageCount?: number | null;
}) {
  if (input.type === 'PERCENTAGE' && input.value > 100) {
    throw new ApiError('Percentage discounts cannot exceed 100', 400, 'INVALID_DISCOUNT_VALUE');
  }
  if (input.scope === 'PRODUCT' && !input.productId) {
    throw new ApiError('Product discounts require a product', 400, 'DISCOUNT_PRODUCT_REQUIRED');
  }
  if (input.scope === 'SUBSCRIPTION' && input.productId) {
    throw new ApiError('Subscription discounts cannot target a product', 400, 'DISCOUNT_PRODUCT_NOT_ALLOWED');
  }
  if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) {
    throw new ApiError('End date cannot be before start date', 400, 'INVALID_DISCOUNT_DATE_RANGE');
  }
  if (input.maxUsageCount !== null && input.maxUsageCount !== undefined && input.maxUsageCount < 1) {
    throw new ApiError('Maximum usage count must be positive', 400, 'INVALID_DISCOUNT_USAGE_LIMIT');
  }
}

export async function getDiscountRules(input: unknown) {
  const query = discountRuleListQuerySchema.parse(input) as DiscountRuleListQuery;
  const search = query.search?.trim();
  const where: Prisma.DiscountRuleWhereInput = {
    ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.scope ? { scope: query.scope } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {})
  };
  const { skip, take } = paginationArgs(query);
  const [items, total] = await findDiscountRules(where, skip, take);
  return paginationResponse(items, total, query);
}

export async function getDiscountRule(id: string) {
  const rule = await findDiscountRuleById(id);
  if (!rule) {
    throw new ApiError('Discount rule not found', 404, 'DISCOUNT_NOT_FOUND');
  }
  return rule;
}

export async function addDiscountRule(input: unknown, actorId: string) {
  const data = discountRuleValidator.parse(input) as DiscountRuleInput;
  validateEffectiveRule(data);
  await validateProduct(data.productId);
  return insertDiscountRule({
    name: data.name,
    description: data.description,
    type: data.type,
    scope: data.scope,
    value: data.value,
    minPurchase: data.minPurchase,
    minQuantity: data.minQuantity,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    maxUsageCount: data.maxUsageCount,
    isActive: data.isActive,
    ...(data.productId ? { product: { connect: { id: data.productId } } } : {}),
    createdBy: { connect: { id: actorId } }
  });
}

export async function editDiscountRule(id: string, input: unknown) {
  const existing = await getDiscountRule(id);
  const data = discountRuleUpdateValidator.parse(input) as DiscountRuleUpdateInput;
  const effective = {
    type: data.type ?? existing.type,
    scope: data.scope ?? existing.scope,
    value: data.value ?? Number(existing.value),
    productId: data.productId === undefined ? existing.productId : data.productId,
    startsAt: data.startsAt === undefined ? existing.startsAt : data.startsAt,
    endsAt: data.endsAt === undefined ? existing.endsAt : data.endsAt,
    maxUsageCount: data.maxUsageCount === undefined ? existing.maxUsageCount : data.maxUsageCount
  };
  validateEffectiveRule(effective);
  await validateProduct(effective.productId);
  if (
    effective.maxUsageCount !== null &&
    effective.maxUsageCount !== undefined &&
    effective.maxUsageCount < existing.usageCount
  ) {
    throw new ApiError(
      'Maximum usage count cannot be below current usage',
      409,
      'DISCOUNT_USAGE_LIMIT_TOO_LOW',
      { usageCount: existing.usageCount }
    );
  }

  const updateData: Prisma.DiscountRuleUpdateInput = {
    name: data.name,
    description: data.description,
    type: data.type,
    scope: data.scope,
    value: data.value,
    minPurchase: data.minPurchase,
    minQuantity: data.minQuantity,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    maxUsageCount: data.maxUsageCount,
    isActive: data.isActive
  };
  if (data.productId === null || (data.scope === 'SUBSCRIPTION' && data.scope !== undefined)) {
    updateData.product = { disconnect: true };
  } else if (data.productId) {
    updateData.product = { connect: { id: data.productId } };
  }
  return updateDiscountRule(id, updateData);
}

export async function deactivateDiscountRule(id: string) {
  await getDiscountRule(id);
  await updateDiscountRule(id, { isActive: false });
}
