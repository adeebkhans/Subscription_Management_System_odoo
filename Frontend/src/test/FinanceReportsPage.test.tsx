import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/ui/Toast';
import { api } from '../lib/api';
import { FinanceReportsPage } from '../pages/reports/FinanceReportsPage';
import type { FinanceReport, Invoice } from '../types';

vi.mock('../lib/api', () => ({
  api: {
    reports: {
      finance: vi.fn(),
      overdueInvoices: vi.fn()
    },
    users: {
      listCustomers: vi.fn()
    },
    catalog: {
      listPlans: vi.fn()
    },
    invoices: {
      action: vi.fn(),
      addPayment: vi.fn()
    }
  }
}));

const summary: FinanceReport = {
  asOf: '2026-10-31T12:00:00.000Z',
  filters: {
    from: null,
    to: null,
    customerId: null,
    planId: null,
    status: null
  },
  activeSubscriptions: 12,
  collectedRevenue: 18000,
  outstandingRevenue: 4200,
  outstandingInvoiceCount: 3,
  overdueInvoices: 1,
  overdueAmount: 1200
};

const overdueInvoice: Invoice = {
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
  periodStart: '2026-09-01T00:00:00.000Z',
  periodEnd: '2026-09-30T23:59:59.999Z',
  issueDate: '2026-09-01T00:00:00.000Z',
  dueDate: '2026-09-15T00:00:00.000Z',
  status: 'CONFIRMED',
  subtotal: '1000',
  taxTotal: '180',
  total: '1180',
  amountPaid: '0',
  discountTotal: '0',
  balanceDue: 1180,
  lines: [],
  discounts: [],
  payments: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z'
};

describe('FinanceReportsPage', () => {
  beforeEach(() => {
    vi.mocked(api.reports.finance).mockResolvedValue(summary);
    vi.mocked(api.reports.overdueInvoices).mockImplementation(async ({ page = 1 } = {}) => ({
      items: [overdueInvoice],
      pagination: { page, pageSize: 20, total: 21, totalPages: 2 }
    }));
    vi.mocked(api.users.listCustomers).mockResolvedValue([
      { id: 'customer-id', name: 'Customer One', email: 'customer@example.com', role: 'CUSTOMER' }
    ]);
    vi.mocked(api.catalog.listPlans).mockResolvedValue([
      {
        id: 'plan-id',
        name: 'Monthly Plan',
        price: '100',
        frequency: 'MONTHLY',
        minimumQuantity: 1,
        autoClose: false,
        allowEarlyClose: true,
        allowPause: true,
        allowRenew: true
      }
    ]);
  });

  it('renders summary metrics and paginated overdue invoices', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <FinanceReportsPage />
      </ToastProvider>
    );

    expect(await screen.findByText('INV-2026-000001')).toBeInTheDocument();
    expect(screen.getByText('18,000.00')).toBeInTheDocument();
    expect(screen.getByText('4,200.00')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(api.reports.overdueInvoices).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, pageSize: 20, status: 'CONFIRMED' })
      );
    });
  });

  it('applies the selected customer to both report queries', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <FinanceReportsPage />
      </ToastProvider>
    );

    await user.selectOptions(await screen.findByRole('combobox', { name: /filter reports by customer/i }), 'customer-id');

    await waitFor(() => {
      expect(api.reports.finance).toHaveBeenLastCalledWith(
        expect.objectContaining({ customerId: 'customer-id' })
      );
      expect(api.reports.overdueInvoices).toHaveBeenLastCalledWith(
        expect.objectContaining({ customerId: 'customer-id' })
      );
    });
  });
});
