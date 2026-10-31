import { describe, expect, it } from 'vitest';
import { discountRuleValidator } from './discount.validators.js';

const baseRule = {
  name: 'Launch offer',
  type: 'PERCENTAGE' as const,
  scope: 'SUBSCRIPTION' as const,
  value: 10,
  minPurchase: 0,
  minQuantity: 0,
  isActive: true
};

describe('discountRuleValidator', () => {
  it('requires a product for product-scoped rules', () => {
    const result = discountRuleValidator.safeParse({
      ...baseRule,
      scope: 'PRODUCT'
    });

    expect(result.success).toBe(false);
  });

  it('rejects percentage values over one hundred', () => {
    const result = discountRuleValidator.safeParse({
      ...baseRule,
      value: 100.01
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid active date range', () => {
    const result = discountRuleValidator.safeParse({
      ...baseRule,
      startsAt: '2027-01-02T00:00:00.000Z',
      endsAt: '2027-01-01T00:00:00.000Z'
    });

    expect(result.success).toBe(false);
  });
});
