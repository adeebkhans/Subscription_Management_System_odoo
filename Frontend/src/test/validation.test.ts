import { describe, expect, it } from 'vitest';
import {
  loginFormSchema,
  planFormSchema,
  productFormSchema,
  signupFormSchema,
  staffFormSchema
} from '../lib/validation';

describe('authentication validation', () => {
  it('accepts a valid signup payload', () => {
    const result = signupFormSchema.safeParse({
      name: 'Alex Morgan',
      email: 'alex@example.com',
      password: 'Strong@123',
      confirmPassword: 'Strong@123'
    });
    expect(result.success).toBe(true);
  });

  it('rejects passwords that do not meet the policy', () => {
    const result = signupFormSchema.safeParse({
      name: 'Alex Morgan',
      email: 'alex@example.com',
      password: 'weakpassword',
      confirmPassword: 'weakpassword'
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain('Include an uppercase letter');
      expect(messages).toContain('Include a special character');
    }
  });

  it('rejects mismatched confirmation passwords', () => {
    const result = signupFormSchema.safeParse({
      name: 'Alex Morgan',
      email: 'alex@example.com',
      password: 'Strong@123',
      confirmPassword: 'Different@123'
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Passwords do not match')).toBe(
        true
      );
    }
  });

  it('requires an email for login', () => {
    const result = loginFormSchema.safeParse({ email: '', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join('.'));
      expect(paths).toContain('email');
      expect(paths).toContain('password');
    }
  });

  it('only allows staff and admin roles for team creation', () => {
    const result = staffFormSchema.safeParse({
      name: 'Jordan Lee',
      email: 'jordan@example.com',
      password: 'Strong@123',
      role: 'CUSTOMER'
    });
    expect(result.success).toBe(false);
  });
});

describe('catalog validation', () => {
  it('accepts a product with additive variant pricing', () => {
    const result = productFormSchema.safeParse({
      name: 'Business Suite',
      type: 'SERVICE',
      salesPrice: '1500',
      costPrice: '400',
      notes: '',
      variants: [{ attribute: 'Brand', value: 'Odoo', extraPrice: '560' }]
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.salesPrice).toBe(1500);
      expect(result.data.variants[0].extraPrice).toBe(560);
    }
  });

  it('rejects duplicate variant attribute and value combinations', () => {
    const result = productFormSchema.safeParse({
      name: 'Business Suite',
      type: 'SERVICE',
      salesPrice: '1500',
      costPrice: '400',
      variants: [
        { attribute: 'Brand', value: 'Odoo', extraPrice: '560' },
        { attribute: 'brand', value: 'odoo', extraPrice: '100' }
      ]
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.message.includes('already used')
        )
      ).toBe(true);
    }
  });

  it('rejects negative prices', () => {
    const result = productFormSchema.safeParse({
      name: 'Business Suite',
      type: 'SERVICE',
      salesPrice: '-1',
      costPrice: '400',
      variants: []
    });
    expect(result.success).toBe(false);
  });

  it('rejects a plan availability window that ends before it starts', () => {
    const result = planFormSchema.safeParse({
      name: 'Monthly Business',
      price: '1500',
      frequency: 'MONTHLY',
      minimumQuantity: '1',
      availableFrom: '2027-11-01T00:00',
      availableUntil: '2026-11-01T00:00',
      autoClose: false,
      allowEarlyClose: true,
      allowPause: true,
      allowRenew: true
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.message.includes('cannot be before')
        )
      ).toBe(true);
    }
  });

  it('accepts a complete lifecycle policy configuration', () => {
    const result = planFormSchema.safeParse({
      name: 'Monthly Business',
      price: '1500',
      frequency: 'MONTHLY',
      minimumQuantity: '1',
      availableFrom: '',
      availableUntil: '',
      autoClose: false,
      allowEarlyClose: true,
      allowPause: true,
      allowRenew: true
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(1500);
      expect(result.data.minimumQuantity).toBe(1);
    }
  });
});
