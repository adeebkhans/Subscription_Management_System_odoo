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

export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';

export type InvoiceAction = 'CONFIRM' | 'CANCEL' | 'SEND' | 'PRINT';

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  productId?: string | null;
  product?: { id: string; name: string } | null;
  variantId?: string | null;
  variant?: { id: string; attribute: string; value: string } | null;
  description: string;
  quantity: number;
  unitPrice: number | string;
  taxRate: number | string;
  taxAmount: number | string;
  lineAmount: number | string;
  sortOrder: number;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number | string;
  method: PaymentMethod;
  paidAt: string;
  note?: string | null;
  reference?: string | null;
  createdById?: string | null;
  createdAt: string;
}

export interface InvoiceDiscount {
  id: string;
  invoiceId: string;
  discountRuleId?: string | null;
  name: string;
  type: 'FIXED' | 'PERCENTAGE';
  scope: 'PRODUCT' | 'SUBSCRIPTION';
  value: number | string;
  amount: number | string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  billingKey: string;
  subscriptionId: string;
  subscription: {
    id: string;
    number: string;
    status: SubscriptionStatus;
    plan: { id: string; name: string; frequency: BillingFrequency };
  };
  customerId: string;
  customerName: string;
  customerEmail: string;
  customer: SubscriptionCustomer;
  periodStart: string;
  periodEnd: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotal: number | string;
  taxTotal: number | string;
  total: number | string;
  amountPaid: number | string;
  discountTotal: number | string;
  balanceDue: number | string;
  confirmedAt?: string | null;
  paidAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  sentAt?: string | null;
  printedAt?: string | null;
  lines: InvoiceLine[];
  discounts: InvoiceDiscount[];
  payments: InvoicePayment[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: InvoiceStatus;
  customerId?: string;
  subscriptionId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export interface FinanceReportParams {
  from?: string;
  to?: string;
  asOf?: string;
  customerId?: string;
  planId?: string;
  status?: InvoiceStatus;
}

export interface FinanceReport {
  asOf: string;
  filters: {
    from: string | null;
    to: string | null;
    customerId: string | null;
    planId: string | null;
    status: InvoiceStatus | null;
  };
  activeSubscriptions: number;
  collectedRevenue: number;
  outstandingRevenue: number;
  outstandingInvoiceCount: number;
  overdueInvoices: number;
  overdueAmount: number;
}

export interface OverdueInvoiceParams extends Omit<FinanceReportParams, 'status'> {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: 'CONFIRMED' | 'PAID';
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination?: PaginationMeta;
}

export interface GenerateInvoiceInput {
  subscriptionId: string;
  periodStart?: string;
  periodEnd?: string;
  issueDate?: string;
}

export interface PaymentInput {
  amount: number;
  method: PaymentMethod;
  paidAt?: string;
  note?: string;
  reference?: string;
}

export type DiscountType = 'FIXED' | 'PERCENTAGE';
export type DiscountScope = 'PRODUCT' | 'SUBSCRIPTION';

export interface DiscountRule {
  id: string;
  name: string;
  description?: string | null;
  type: DiscountType;
  scope: DiscountScope;
  value: number | string;
  minPurchase: number | string;
  minQuantity: number;
  startsAt?: string | null;
  endsAt?: string | null;
  maxUsageCount?: number | null;
  usageCount: number;
  isActive: boolean;
  productId?: string | null;
  product?: { id: string; name: string; isActive: boolean } | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountRuleInput {
  name: string;
  description?: string;
  type: DiscountType;
  scope: DiscountScope;
  value: number;
  minPurchase: number;
  minQuantity: number;
  startsAt?: string;
  endsAt?: string;
  maxUsageCount?: number;
  isActive: boolean;
  productId?: string;
}

export type DiscountRuleUpdateInput = Omit<
  Partial<DiscountRuleInput>,
  'description' | 'startsAt' | 'endsAt' | 'maxUsageCount' | 'productId'
> & {
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  maxUsageCount?: number | null;
  productId?: string | null;
};

export interface DiscountRuleListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: DiscountType;
  scope?: DiscountScope;
  isActive?: boolean;
}

export interface PortalSubscriptionListParams {
  page?: number;
  pageSize?: number;
  status?: SubscriptionStatus;
}

export interface PortalInvoiceListParams {
  page?: number;
  pageSize?: number;
  status?: InvoiceStatus;
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
