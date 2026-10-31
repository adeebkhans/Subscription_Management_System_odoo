export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
}

export type ProductType = 'GOODS' | 'SERVICE';

export interface ProductVariant {
  id?: string;
  attribute: string;
  value: string;
  extraPrice: number | string;
  isActive?: boolean;
}

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  salesPrice: number | string;
  costPrice: number | string;
  notes?: string | null;
  isActive?: boolean;
  variants: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;
}

export type BillingFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Plan {
  id: string;
  name: string;
  price: number | string;
  frequency: BillingFrequency;
  minimumQuantity: number;
  availableFrom?: string | null;
  availableUntil?: string | null;
  autoClose: boolean;
  allowEarlyClose: boolean;
  allowPause: boolean;
  allowRenew: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariantInput {
  attribute: string;
  value: string;
  extraPrice: number;
}

export interface ProductInput {
  name: string;
  type: ProductType;
  salesPrice: number;
  costPrice: number;
  notes?: string | null;
  variants: ProductVariantInput[];
}

export type ProductUpdateInput = Partial<ProductInput>;

export interface PlanInput {
  name: string;
  price: number;
  frequency: BillingFrequency;
  minimumQuantity: number;
  availableFrom?: string | null;
  availableUntil?: string | null;
  autoClose: boolean;
  allowEarlyClose: boolean;
  allowPause: boolean;
  allowRenew: boolean;
}

export type PlanUpdateInput = Partial<PlanInput>;

export interface StaffInput {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'STAFF';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
  confirmPassword: string;
}
