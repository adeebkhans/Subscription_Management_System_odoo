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

export interface PaymentTerm {
  id: string;
  name: string;
  dueDays: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentTermInput {
  name: string;
  dueDays: number;
  isActive: boolean;
}

export type PaymentTermUpdateInput = Partial<PaymentTermInput>;

export interface QuotationTemplateLine {
  id: string;
  templateId?: string;
  productId: string;
  variantId?: string | null;
  product?: Product;
  variant?: ProductVariant | null;
  quantity: number;
  unitPrice: number | string | null;
  taxRate: number | string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuotationTemplate {
  id: string;
  name: string;
  description?: string | null;
  validityDays: number;
  planId?: string | null;
  plan?: Plan | null;
  isActive: boolean;
  createdById?: string | null;
  lines: QuotationTemplateLine[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QuotationLineInput {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice?: number;
  taxRate: number;
  sortOrder: number;
}

export interface QuotationInput {
  name: string;
  description?: string;
  validityDays: number;
  planId?: string;
  isActive: boolean;
  lines: QuotationLineInput[];
}

export interface QuotationUpdateInput {
  name?: string;
  description?: string | null;
  validityDays?: number;
  planId?: string | null;
  isActive?: boolean;
  lines?: QuotationLineInput[];
}

export type SubscriptionStatus =
  | 'DRAFT'
  | 'QUOTATION'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CLOSED'
  | 'CANCELLED';

export type SubscriptionAction =
  | 'SUBMIT'
  | 'CONFIRM'
  | 'ACTIVATE'
  | 'PAUSE'
  | 'RESUME'
  | 'CLOSE'
  | 'CANCEL';

export interface CustomerOption {
  id: string;
  name: string;
  email: string;
}

export interface SubscriptionCustomer {
  id: string;
  name: string;
  email: string;
}

export interface SubscriptionLine {
  id: string;
  subscriptionId?: string;
  productId: string;
  product?: Product;
  variantId?: string | null;
  variant?: ProductVariant | null;
  description?: string | null;
  quantity: number;
  unitPrice: number | string;
  taxRate: number | string;
  taxAmount: number | string;
  lineAmount: number | string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subscription {
  id: string;
  number: string;
  customerId: string;
  customer: SubscriptionCustomer;
  planId: string;
  plan: Plan;
  status: SubscriptionStatus;
  startDate: string;
  expiryDate?: string | null;
  paymentTermId?: string | null;
  paymentTerm?: PaymentTerm | null;
  quotationTemplateId?: string | null;
  quotationTemplate?: {
    id: string;
    name: string;
    validityDays: number;
  } | null;
  quotationValidUntil?: string | null;
  subtotal: number | string;
  taxTotal: number | string;
  total: number | string;
  notes?: string | null;
  cancelledReason?: string | null;
  pausedAt?: string | null;
  closedAt?: string | null;
  renewedFromId?: string | null;
  createdById?: string | null;
  lines: SubscriptionLine[];
  availableActions?: SubscriptionAction[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionLineInput {
  productId: string;
  variantId?: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
  taxRate: number;
}

export interface SubscriptionInput {
  customerId: string;
  planId?: string;
  quotationTemplateId?: string;
  startDate: string;
  expiryDate?: string;
  paymentTermId?: string;
  notes?: string;
  lines?: SubscriptionLineInput[];
}

export interface SubscriptionUpdateInput {
  startDate?: string;
  expiryDate?: string | null;
  paymentTermId?: string | null;
  notes?: string | null;
  lines?: SubscriptionLineInput[];
}

export interface SubscriptionRenewInput {
  startDate?: string;
  expiryDate?: string;
}

export interface SubscriptionListParams {
  search?: string;
  status?: SubscriptionStatus;
  customerId?: string;
  planId?: string;
  startDateFrom?: string;
  startDateTo?: string;
}
