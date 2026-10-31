import { describe, expect, it } from 'vitest';
import { discountRuleFormSchema } from './validation';

const subscriptionRule = {
  name: 'Annual offer',
  description: '',
  type: 'PERCENTAGE' as const,
  scope: 'SUBSCRIPTION' as const,
  value: '10',
  minPurchase: '1000',
  minQuantity: '1',
  startsAt: '',
  endsAt: '',
  maxUsageCount: '',
  productId: ''
};

describe('discountRuleFormSchema', () => {
  it('accepts a percentage subscription rule and converts numeric fields', () => {
    expect(discountRuleFormSchema.parse(subscriptionRule)).toMatchObject({
      name: 'Annual offer',
      value: 10,
      minPurchase: 1000,
      minQuantity: 1,
      maxUsageCount: undefined
    });
  });

  it('requires a target product for product-scoped rules', () => {
    const result = discountRuleFormSchema.safeParse({
      ...subscriptionRule,
      scope: 'PRODUCT'
    });
    expect(result.success).toBe(false);
  });

  it('rejects percentage values over one hundred', () => {
    const result = discountRuleFormSchema.safeParse({
      ...subscriptionRule,
      value: '101'
    });
    expect(result.success).toBe(false);
  });

  it('rejects a maximum usage count below current minimum', () => {
    const result = discountRuleFormSchema.safeParse({
      ...subscriptionRule,
      maxUsageCount: '0'
    });
    expect(result.success).toBe(false);
  });
});
