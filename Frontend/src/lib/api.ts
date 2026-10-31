import type {
  AuthResponse,
  DiscountRule,
  DiscountRuleInput,
  DiscountRuleListParams,
  DiscountRuleUpdateInput,
  FinanceReport,
  FinanceReportParams,
  GenerateInvoiceInput,
  Invoice,
  InvoiceAction,
  InvoiceListParams,
  LoginInput,
  PaymentTerm,
  PaymentTermInput,
  PaymentTermUpdateInput,
  PaymentInput,
  PaginatedResult,
  OverdueInvoiceParams,
  PortalInvoiceListParams,
  PortalSubscriptionListParams,
  Plan,
  PlanInput,
  PlanUpdateInput,
  Product,
  ProductInput,
  ProductUpdateInput,
  QuotationInput,
  QuotationTemplate,
  QuotationUpdateInput,
  ResetPasswordInput,
  SignupInput,
  StaffInput,
  Subscription,
  SubscriptionAction,
  SubscriptionInput,
  SubscriptionListParams,
  SubscriptionRenewInput,
  SubscriptionUpdateInput,
  User
} from '../types';

const apiOrigin = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
const API_ROOT = `${apiOrigin}/api`;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

let refreshPromise: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_ROOT}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' }
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      ...init,
      headers,
      credentials: 'include'
    });
  } catch {
    throw new ApiError(
      'Unable to reach the server. Check that the backend is running.',
      0,
      'NETWORK_ERROR'
    );
  }

  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request<T>(path, init, false);
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await readBody(response);

  if (!response.ok) {
    const payload =
      body && typeof body === 'object' && 'error' in body
        ? (body as { error?: { message?: string; code?: string; details?: unknown } }).error
        : undefined;
    throw new ApiError(
      payload?.message ?? 'Request failed. Please try again.',
      response.status,
      payload?.code ?? 'API_ERROR',
      payload?.details
    );
  }

  return (body as { data: T } | null)?.data as T;
}

function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function extractItems<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!isRecord(payload)) return [];
  for (const key of ['items', 'data', 'results', 'records']) {
    const value = payload[key];
    if (Array.isArray(value)) return value as T[];
  }
  return [];
}

function extractPagination(payload: unknown): PaginatedResult<unknown>['pagination'] {
  if (!isRecord(payload) || !isRecord(payload.pagination)) return undefined;
  const { page, pageSize, total, totalPages } = payload.pagination;
  if (
    typeof page !== 'number' ||
    typeof pageSize !== 'number' ||
    typeof total !== 'number' ||
    typeof totalPages !== 'number'
  ) {
    return undefined;
  }
  return { page, pageSize, total, totalPages };
}

function listQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

const firstPage = { page: 1, pageSize: 100 } as const;

export const api = {
  auth: {
    signup: (input: SignupInput) =>
      request<AuthResponse>('/auth/signup', { method: 'POST', body: jsonBody(input) }),
    login: (input: LoginInput) =>
      request<AuthResponse>('/auth/login', { method: 'POST', body: jsonBody(input) }),
    logout: () => request<void>('/auth/logout', { method: 'POST' }),
    me: () => request<{ user: User }>('/auth/me').then((result) => result.user),
    refresh: () => request<AuthResponse>('/auth/refresh', { method: 'POST' }),
    forgotPassword: (email: string) =>
      request<{ message: string; resetToken?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: jsonBody({ email })
      }),
    resetPassword: (input: ResetPasswordInput) =>
      request<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: jsonBody(input)
      })
  },
  users: {
    list: () =>
      request<unknown>(`/users${listQuery(firstPage)}`).then((payload) =>
        extractItems<User>(payload)
      ),
    listCustomers: () =>
      request<unknown>(
        `/users${listQuery({ ...firstPage, role: 'CUSTOMER', isActive: true })}`
      ).then((payload) => extractItems<User>(payload)),
    create: (input: StaffInput) =>
      request<User>('/users', { method: 'POST', body: jsonBody(input) })
  },
  catalog: {
    listProducts: () =>
      request<unknown>(
        `/catalog/products${listQuery({ ...firstPage, isActive: true })}`
      ).then((payload) => extractItems<Product>(payload)),
    createProduct: (input: ProductInput) =>
      request<Product>('/catalog/products', { method: 'POST', body: jsonBody(input) }),
    updateProduct: (id: string, input: ProductUpdateInput) =>
      request<Product>(`/catalog/products/${id}`, {
        method: 'PATCH',
        body: jsonBody(input)
      }),
    deleteProduct: (id: string) =>
      request<void>(`/catalog/products/${id}`, { method: 'DELETE' }),
    listPlans: (params: { isActive?: boolean } = { isActive: true }) =>
      request<unknown>(
        `/catalog/plans${listQuery({ ...firstPage, ...params })}`
      ).then((payload) => extractItems<Plan>(payload)),
    createPlan: (input: PlanInput) =>
      request<Plan>('/catalog/plans', { method: 'POST', body: jsonBody(input) }),
    updatePlan: (id: string, input: PlanUpdateInput) =>
      request<Plan>(`/catalog/plans/${id}`, {
        method: 'PATCH',
        body: jsonBody(input)
      }),
    deletePlan: (id: string) => request<void>(`/catalog/plans/${id}`, { method: 'DELETE' })
  },
  paymentTerms: {
    list: (params: { search?: string; isActive?: boolean } = {}) =>
      request<unknown>(`/payment-terms${listQuery({ ...firstPage, ...params })}`).then(
        (payload) => extractItems<PaymentTerm>(payload)
      ),
    get: (id: string) => request<PaymentTerm>(`/payment-terms/${id}`),
    create: (input: PaymentTermInput) =>
      request<PaymentTerm>('/payment-terms', { method: 'POST', body: jsonBody(input) }),
    update: (id: string, input: PaymentTermUpdateInput) =>
      request<PaymentTerm>(`/payment-terms/${id}`, {
        method: 'PATCH',
        body: jsonBody(input)
      }),
    deactivate: (id: string) =>
      request<void>(`/payment-terms/${id}`, { method: 'DELETE' })
  },
  quotations: {
    list: (params: { search?: string; isActive?: boolean } = {}) =>
      request<unknown>(`/quotations${listQuery({ ...firstPage, ...params })}`).then(
        (payload) => extractItems<QuotationTemplate>(payload)
      ),
    get: (id: string) => request<QuotationTemplate>(`/quotations/${id}`),
    create: (input: QuotationInput) =>
      request<QuotationTemplate>('/quotations', { method: 'POST', body: jsonBody(input) }),
    update: (id: string, input: QuotationUpdateInput) =>
      request<QuotationTemplate>(`/quotations/${id}`, {
        method: 'PATCH',
        body: jsonBody(input)
      }),
    deactivate: (id: string) =>
      request<void>(`/quotations/${id}`, { method: 'DELETE' })
  },
  subscriptions: {
    list: (params: SubscriptionListParams = {}) =>
      request<unknown>(`/subscriptions${listQuery({ ...firstPage, ...params })}`).then(
        (payload) => extractItems<Subscription>(payload)
      ),
    get: (id: string) => request<Subscription>(`/subscriptions/${id}`),
    create: (input: SubscriptionInput) =>
      request<Subscription>('/subscriptions', {
        method: 'POST',
        body: jsonBody(input)
      }),
    update: (id: string, input: SubscriptionUpdateInput) =>
      request<Subscription>(`/subscriptions/${id}`, {
        method: 'PATCH',
        body: jsonBody(input)
      }),
    transition: (id: string, action: SubscriptionAction, reason?: string) =>
      request<Subscription>(`/subscriptions/${id}/transition`, {
        method: 'POST',
        body: jsonBody({ action, ...(reason ? { reason } : {}) })
      }),
    renew: (id: string, input: SubscriptionRenewInput) =>
      request<Subscription>(`/subscriptions/${id}/renew`, {
        method: 'POST',
        body: jsonBody(input)
      }),
    autoClose: () =>
      request<{ closedCount: number; closedIds: string[] }>('/subscriptions/auto-close', {
        method: 'POST'
      })
  },
  invoices: {
    list: (params: InvoiceListParams = {}) =>
      request<unknown>(`/invoices${listQuery({ ...firstPage, ...params })}`).then((payload) => ({
        items: extractItems<Invoice>(payload),
        pagination: extractPagination(payload)
      })),
    get: (id: string) => request<Invoice>(`/invoices/${id}`),
    generate: (input: GenerateInvoiceInput) =>
      request<{ invoice: Invoice; created: boolean }>('/invoices/generate', {
        method: 'POST',
        body: jsonBody(input)
      }),
    billingRun: (asOf?: string) =>
      request<{
        asOf: string;
        processedSubscriptions: number;
        createdCount: number;
        existingCount: number;
        invoiceNumbers: string[];
      }>('/invoices/billing-run', {
        method: 'POST',
        body: jsonBody(asOf ? { asOf } : {})
      }),
    action: (id: string, action: InvoiceAction, reason?: string) =>
      request<Invoice>(`/invoices/${id}/action`, {
        method: 'POST',
        body: jsonBody({ action, ...(reason ? { reason } : {}) })
      }),
    addPayment: (id: string, input: PaymentInput) =>
      request<Invoice>(`/invoices/${id}/payments`, {
        method: 'POST',
        body: jsonBody(input)
      })
  },
  discounts: {
    list: (params: DiscountRuleListParams = {}) =>
      request<PaginatedResult<DiscountRule>>(
        `/discounts${listQuery({ ...firstPage, ...params })}`
      ),
    get: (id: string) => request<DiscountRule>(`/discounts/${id}`),
    create: (input: DiscountRuleInput) =>
      request<DiscountRule>('/discounts', { method: 'POST', body: jsonBody(input) }),
    update: (id: string, input: DiscountRuleUpdateInput) =>
      request<DiscountRule>(`/discounts/${id}`, {
        method: 'PATCH',
        body: jsonBody(input)
      }),
    deactivate: (id: string) =>
      request<void>(`/discounts/${id}`, { method: 'DELETE' })
  },
  portal: {
    subscriptions: (params: PortalSubscriptionListParams = {}) =>
      request<PaginatedResult<Subscription>>(
        `/portal/subscriptions${listQuery({ ...firstPage, ...params })}`
      ),
    subscription: (id: string) => request<Subscription>(`/portal/subscriptions/${id}`),
    invoices: (params: PortalInvoiceListParams = {}) =>
      request<PaginatedResult<Invoice>>(
        `/portal/invoices${listQuery({ ...firstPage, ...params })}`
      ),
    invoice: (id: string) => request<Invoice>(`/portal/invoices/${id}`)
  },
  reports: {
    finance: (params: FinanceReportParams = {}) =>
      request<FinanceReport>(`/reports/finance${listQuery({ ...params })}`),
    overdueInvoices: (params: OverdueInvoiceParams = {}) =>
      request<PaginatedResult<Invoice>>(
        `/reports/overdue-invoices${listQuery({ ...firstPage, ...params })}`
      )
  }
};
