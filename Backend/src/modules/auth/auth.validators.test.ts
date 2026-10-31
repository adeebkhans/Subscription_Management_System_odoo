import { describe, expect, it } from 'vitest';
import {
  loginValidator,
  resetPasswordValidator,
  signupValidator
} from './auth.validators.js';

describe('signupValidator', () => {
  it('accepts a compliant password', () => {
    expect(
      signupValidator.safeParse({
        email: 'buyer@example.com',
        password: 'Strong@123',
        name: 'Buyer Name'
      }).success
    ).toBe(true);
  });

  it('rejects passwords of eight characters or fewer', () => {
    const result = signupValidator.safeParse({
      email: 'buyer@example.com',
      password: 'Abc@123',
      name: 'Buyer Name'
    });

    expect(result.success).toBe(false);
  });

  it('requires lowercase, uppercase, and special characters', () => {
    for (const password of ['alllowercase@1', 'ALLUPPERCASE@1', 'NoSpecial1234']) {
      expect(
        signupValidator.safeParse({ email: 'buyer@example.com', password, name: 'Buyer' }).success
      ).toBe(false);
    }
  });

  it('rejects invalid email addresses', () => {
    expect(
      signupValidator.safeParse({ email: 'not-an-email', password: 'Strong@123', name: 'Buyer' }).success
    ).toBe(false);
  });
});

describe('resetPasswordValidator', () => {
  it('requires matching passwords', () => {
    const result = resetPasswordValidator.safeParse({
      token: 'a'.repeat(32),
      password: 'Strong@123',
      confirmPassword: 'Strong@124'
    });

    expect(result.success).toBe(false);
  });
});

describe('loginValidator', () => {
  it('requires an email and password', () => {
    expect(loginValidator.safeParse({ email: 'buyer@example.com', password: 'x' }).success).toBe(true);
    expect(loginValidator.safeParse({ email: 'buyer@example.com' }).success).toBe(false);
  });
});
