import { describe, expect, it } from 'vitest';
import { selectBestDiscount, type DiscountRuleCandidate } from './discount.calculator.js';

const subscriptionRule: DiscountRuleCandidate = {
  id: 'subscription',
  name: 'Subscription discount',
  type: 'PERCENTAGE',
  scope: 'SUBSCRIPTION',
  value: 10,
  minPurchase: 0,
  minQuantity: 0,
  productId: null,
  maxUsageCount: null,
  usageCount: 0
};

describe('selectBestDiscount', () => {
  const lines = [
    { productId: 'product-a', quantity: 2, lineAmount: 100 },
    { productId: 'product-b', quantity: 1, lineAmount: 50 }
  ];

  it('selects the product or subscription rule with the highest saving', () => {
    const application = selectBestDiscount(
      [
        subscriptionRule,
        {
          ...subscriptionRule,
          id: 'product',
          name: 'Product discount',
          scope: 'PRODUCT',
          value: 50,
          productId: 'product-a'
        }
      ],
      lines
    );

    expect(application?.rule.id).toBe('product');
    expect(application?.amount).toBe(50);
  });

  it('caps fixed discounts at the applicable base', () => {
    const application = selectBestDiscount(
      [{
        ...subscriptionRule,
        type: 'FIXED',
        value: 999,
        minPurchase: 100
      }],
      lines
    );

    expect(application?.amount).toBe(150);
  });

  it('does not select exhausted or ineligible rules', () => {
    const application = selectBestDiscount(
      [{
        ...subscriptionRule,
        maxUsageCount: 1,
        usageCount: 1,
        minQuantity: 10
      }],
      lines
    );

    expect(application).toBeNull();
  });
});
