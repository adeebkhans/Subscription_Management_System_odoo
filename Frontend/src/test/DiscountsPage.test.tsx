import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/ui/Toast';
import { api } from '../lib/api';
import { DiscountsPage } from '../pages/discounts/DiscountsPage';
import type { DiscountRule } from '../types';

vi.mock('../lib/api', () => ({
  api: {
    discounts: {
      list: vi.fn(),
      deactivate: vi.fn()
    },
    catalog: {
      listProducts: vi.fn()
    }
  }
}));

const rule: DiscountRule = {
  id: 'rule-id',
  name: 'Annual retention offer',
  description: 'For annual plans',
  type: 'PERCENTAGE',
  scope: 'SUBSCRIPTION',
  value: '10',
  minPurchase: '1000',
  minQuantity: 1,
  startsAt: null,
  endsAt: null,
  maxUsageCount: 20,
  usageCount: 20,
  isActive: true,
  productId: null,
  product: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z'
};

describe('DiscountsPage', () => {
  beforeEach(() => {
    vi.mocked(api.discounts.list).mockResolvedValue({
      items: [rule],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 }
    });
    vi.mocked(api.catalog.listProducts).mockResolvedValue([]);
  });

  it('shows discount eligibility and exhausted usage state', async () => {
    render(
      <ToastProvider>
        <DiscountsPage />
      </ToastProvider>
    );

    expect(await screen.findByText('Annual retention offer')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('Exhausted')).toBeInTheDocument();
    expect(screen.getByText(/highest saving wins/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create discount rule/i })).toBeInTheDocument();
  });
});
