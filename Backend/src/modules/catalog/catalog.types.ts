import type { BillingFrequency, ProductType } from '@prisma/client';

export type ProductInput = {
  name: string;
  type: ProductType;
  salesPrice: number;
  costPrice: number;
  notes?: string;
  isActive: boolean;
  variants: Array<{ attribute: string; value: string; extraPrice: number; isActive: boolean }>;
};

export type ProductUpdateInput = Partial<Omit<ProductInput, 'variants'>> & {
  notes?: string | null;
  variants?: ProductInput['variants'];
};

export type PlanInput = {
  name: string;
  price: number;
  frequency: BillingFrequency;
  minimumQuantity: number;
  availableFrom?: Date;
  availableUntil?: Date;
  autoClose: boolean;
  allowEarlyClose: boolean;
  allowPause: boolean;
  allowRenew: boolean;
  isActive: boolean;
};

export type PlanUpdateInput = Partial<Omit<PlanInput, 'availableFrom' | 'availableUntil'>> & {
  availableFrom?: Date | null;
  availableUntil?: Date | null;
};
