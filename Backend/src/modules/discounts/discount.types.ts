import type { DiscountScope, DiscountType, Prisma } from '@prisma/client';

export type DiscountRuleInput = {
  name: string;
  description?: string;
  type: DiscountType;
  scope: DiscountScope;
  value: number;
  minPurchase: number;
  minQuantity: number;
  startsAt?: Date;
  endsAt?: Date;
  maxUsageCount?: number;
  isActive: boolean;
  productId?: string;
};

export type DiscountRuleUpdateInput = Partial<DiscountRuleInput> & {
  description?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  maxUsageCount?: number | null;
  productId?: string | null;
};

export type DiscountRuleListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  type?: DiscountType;
  scope?: DiscountScope;
  isActive?: boolean;
};

export type DiscountRuleWhereInput = Prisma.DiscountRuleWhereInput;
