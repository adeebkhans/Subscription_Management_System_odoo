import type {
  AuthResponse,
  LoginInput,
  Plan,
  PlanInput,
  PlanUpdateInput,
  Product,
  ProductInput,
  ProductUpdateInput,
  ResetPasswordInput,
  SignupInput,
  StaffInput,
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
    listPlans: () =>
      request<unknown>(
        `/catalog/plans${listQuery({ ...firstPage, isActive: true })}`
      ).then((payload) => extractItems<Plan>(payload)),
    createPlan: (input: PlanInput) =>
      request<Plan>('/catalog/plans', { method: 'POST', body: jsonBody(input) }),
    updatePlan: (id: string, input: PlanUpdateInput) =>
      request<Plan>(`/catalog/plans/${id}`, {
        method: 'PATCH',
        body: jsonBody(input)
      }),
    deletePlan: (id: string) => request<void>(`/catalog/plans/${id}`, { method: 'DELETE' })
  }
};
