import { describe, expect, it } from 'vitest';
import { planValidator, productValidator } from './catalog.validators.js';

describe('productValidator', () => {
  it('accepts products without variants', () => {
    const result = productValidator.safeParse({
      name: 'Business Suite',
      type: 'SERVICE',
      salesPrice: 1500,
      costPrice: 400
    });

    expect(result.success).toBe(true);
  });

  it('rejects duplicate attribute and value combinations', () => {
    const result = productValidator.safeParse({
      name: 'Business Suite',
      type: 'SERVICE',
      salesPrice: 1500,
      costPrice: 400,
      variants: [
        { attribute: 'Brand', value: 'Odoo', extraPrice: 560 },
        { attribute: 'brand', value: 'odoo', extraPrice: 100 }
      ]
    });

    expect(result.success).toBe(false);
  });
});

describe('planValidator', () => {
  it('applies lifecycle defaults', () => {
    const result = planValidator.parse({
      name: 'Business Monthly',
      price: 1500,
      frequency: 'MONTHLY'
    });

    expect(result).toMatchObject({
      minimumQuantity: 1,
      autoClose: false,
      allowEarlyClose: true,
      allowPause: true,
      allowRenew: true,
      isActive: true
    });
  });

  it('rejects an availability window that ends before it starts', () => {
    const result = planValidator.safeParse({
      name: 'Business Monthly',
      price: 1500,
      frequency: 'MONTHLY',
      availableFrom: '2027-01-01T00:00:00.000Z',
      availableUntil: '2026-01-01T00:00:00.000Z'
    });

    expect(result.success).toBe(false);
  });
});
