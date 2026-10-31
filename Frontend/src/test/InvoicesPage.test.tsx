import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import { api } from '../lib/api';
import { InvoicesPage } from '../pages/invoices/InvoicesPage';
import type { Invoice, User } from '../types';

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../lib/api', () => ({
  api: {
    invoices: {
      list: vi.fn(),
      billingRun: vi.fn(),
      generate: vi.fn()
    },
    subscriptions: {
      list: vi.fn()
    }
  }
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedList = vi.mocked(api.invoices.list);

const admin: User = {
  id: 'admin-id',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'ADMIN'
};

const invoice: Invoice = {
  id: 'invoice-id',
  number: 'INV-2026-000001',
  billingKey: 'subscription-id:period',
  subscriptionId: 'subscription-id',
  subscription: {
    id: 'subscription-id',
    number: 'SUB-2026-000001',
    status: 'ACTIVE',
    plan: { id: 'plan-id', name: 'Monthly Plan', frequency: 'MONTHLY' }
  },
  customerId: 'customer-id',
  customerName: 'Customer One',
  customerEmail: 'customer@example.com',
  customer: { id: 'customer-id', name: 'Customer One', email: 'customer@example.com' },
  periodStart: '2026-11-01T00:00:00.000Z',
  periodEnd: '2026-11-30T23:59:59.999Z',
  issueDate: '2026-11-01T00:00:00.000Z',
  dueDate: '2026-12-01T00:00:00.000Z',
  status: 'CONFIRMED',
  subtotal: '100',
  taxTotal: '18',
  total: '118',
  amountPaid: '0',
  discountTotal: '0',
  balanceDue: '118',
  lines: [],
  discounts: [],
  payments: [],
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z'
};

function renderPage() {
  return render(
    <ToastProvider>
      <InvoicesPage />
    </ToastProvider>
  );
}

describe('InvoicesPage', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: admin,
      status: 'authenticated',
      isAuthenticated: true,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn()
    });
    mockedList.mockReset();
    mockedList.mockImplementation(async ({ page = 1 } = {}) => ({
      items: [invoice],
      pagination: { page, pageSize: 20, total: 21, totalPages: 2 }
    }));
    vi.mocked(api.subscriptions.list).mockResolvedValue([]);
  });

  it('renders invoice totals and supports paginated results', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('INV-2026-000001')).toBeInTheDocument();
    expect(screen.getAllByText('118.00')).toHaveLength(3);
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run billing/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(mockedList).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, pageSize: 20 })
      );
    });
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
  });

  it('does not expose the admin-only billing run to staff', async () => {
    mockedUseAuth.mockReturnValue({
      user: { ...admin, role: 'STAFF' },
      status: 'authenticated',
      isAuthenticated: true,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn()
    });

    renderPage();
    await screen.findByText('INV-2026-000001');
    expect(screen.queryByRole('button', { name: /run billing/i })).not.toBeInTheDocument();
  });
});
