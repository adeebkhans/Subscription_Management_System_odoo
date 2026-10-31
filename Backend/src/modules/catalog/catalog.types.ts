import type { BillingFrequency, ProductType } from '@prisma/client';

export type ProductInput = {
  name: string;
  type: ProductType;
  salesPrice: number;
  costPrice: number;
  notes?: string;
  variants: Array<{ attribute: string; value: string; extraPrice: number }>;
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
};
