import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { CustomerPortalPage } from '../pages/portal/CustomerPortalPage';
import type { Invoice, Subscription } from '../types';

vi.mock('../lib/api', () => ({
  api: {
    portal: {
      subscriptions: vi.fn(),
      invoices: vi.fn(),
      subscription: vi.fn(),
      invoice: vi.fn()
    }
  }
}));

const subscription: Subscription = {
  id: 'my-subscription',
  number: 'SUB-2026-000001',
  customerId: 'my-customer',
  customer: { id: 'my-customer', name: 'Customer One', email: 'customer@example.com' },
  planId: 'plan-id',
  plan: {
    id: 'plan-id',
    name: 'Monthly Plan',
    price: '100',
    frequency: 'MONTHLY',
    minimumQuantity: 1,
    autoClose: false,
    allowEarlyClose: true,
    allowPause: true,
    allowRenew: true
  },
  status: 'ACTIVE',
  startDate: '2026-11-01T00:00:00.000Z',
  subtotal: '100',
  taxTotal: '18',
  total: '118',
  lines: []
};

const invoice: Invoice = {
  id: 'my-invoice',
  number: 'INV-2026-000001',
  billingKey: 'key',
  subscriptionId: 'my-subscription',
  subscription: {
    id: 'my-subscription',
    number: 'SUB-2026-000001',
    status: 'ACTIVE',
    plan: { id: 'plan-id', name: 'Monthly Plan', frequency: 'MONTHLY' }
  },
  customerId: 'my-customer',
  customerName: 'Customer One',
  customerEmail: 'customer@example.com',
  customer: { id: 'my-customer', name: 'Customer One', email: 'customer@example.com' },
  periodStart: '2026-11-01T00:00:00.000Z',
  periodEnd: '2026-11-30T23:59:59.999Z',
  issueDate: '2026-11-01T00:00:00.000Z',
  dueDate: '2026-12-01T00:00:00.000Z',
  status: 'CONFIRMED',
  subtotal: '100',
  taxTotal: '18',
  total: '108',
  amountPaid: '0',
  discountTotal: '10',
  balanceDue: '108',
  lines: [],
  discounts: [{
    id: 'discount-snapshot',
    invoiceId: 'my-invoice',
    name: 'Annual offer',
    type: 'PERCENTAGE',
    scope: 'SUBSCRIPTION',
    value: '10',
    amount: '10',
    createdAt: '2026-11-01T00:00:00.000Z'
  }],
  payments: [],
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z'
};

describe('CustomerPortalPage', () => {
  beforeEach(() => {
    vi.mocked(api.portal.subscriptions).mockResolvedValue({
      items: [subscription],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 }
    });
    vi.mocked(api.portal.invoices).mockResolvedValue({
      items: [invoice],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 }
    });
  });

  it('shows only portal data and lets the customer inspect invoice discounts and balance', async () => {
    const user = userEvent.setup();
    render(<CustomerPortalPage />);

    expect(await screen.findByText('SUB-2026-000001')).toBeInTheDocument();
    expect(api.portal.subscriptions).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 20 })
    );
    expect(api.portal.subscriptions).not.toHaveBeenCalledWith(
      expect.objectContaining({ customerId: expect.anything() })
    );

    await user.click(screen.getByRole('tab', { name: /my invoices/i }));
    expect(await screen.findByText('INV-2026-000001')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /view details/i }));
    expect(await screen.findByText('Annual offer · Subscription · 10%')).toBeInTheDocument();
    expect(screen.getAllByText('Balance due')).toHaveLength(3);
  });
});
