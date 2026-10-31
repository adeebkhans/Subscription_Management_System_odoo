import { describe, expect, it } from 'vitest';
import { ApiError } from '../../core/errors/ApiError.js';
import {
  assertTransition,
  availableActions,
  isQuotationExpired,
  shouldAutoClose,
  type LifecycleSubject,
  type PlanPolicy
} from './lifecycle.js';

const permissive: PlanPolicy = {
  allowEarlyClose: true,
  allowPause: true,
  allowRenew: true,
  autoClose: false
};

function subject(overrides: Partial<LifecycleSubject> = {}): LifecycleSubject {
  return {
    status: 'DRAFT',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    expiryDate: new Date('2027-01-01T00:00:00.000Z'),
    quotationValidUntil: null,
    ...overrides
  };
}

const now = new Date('2026-06-01T00:00:00.000Z');

describe('subscription lifecycle', () => {
  it('moves through draft, quotation, confirmed, active, closed', () => {
    expect(assertTransition(subject({ status: 'DRAFT' }), permissive, 'SUBMIT', now)).toBe('QUOTATION');
    expect(assertTransition(subject({ status: 'QUOTATION' }), permissive, 'CONFIRM', now)).toBe('CONFIRMED');
    expect(assertTransition(subject({ status: 'CONFIRMED' }), permissive, 'ACTIVATE', now)).toBe('ACTIVE');
    expect(assertTransition(subject({ status: 'ACTIVE' }), permissive, 'CLOSE', now)).toBe('CLOSED');
  });

  it('rejects transitions that skip stages', () => {
    expect(() => assertTransition(subject({ status: 'DRAFT' }), permissive, 'ACTIVATE', now)).toThrow(ApiError);
  });

  it('honours plan pause policy', () => {
    expect(() =>
      assertTransition(subject({ status: 'ACTIVE' }), { ...permissive, allowPause: false }, 'PAUSE', now)
    ).toThrowError(/does not allow pausing/);
  });

  it('blocks early close when the plan forbids it and the subscription is not expired', () => {
    expect(() =>
      assertTransition(subject({ status: 'ACTIVE' }), { ...permissive, allowEarlyClose: false }, 'CLOSE', now)
    ).toThrowError(/does not allow closing/);
  });

  it('allows close on an expired subscription even without early close', () => {
    const expired = subject({ status: 'ACTIVE', expiryDate: new Date('2026-05-01T00:00:00.000Z') });
    expect(assertTransition(expired, { ...permissive, allowEarlyClose: false }, 'CLOSE', now)).toBe('CLOSED');
  });

  it('detects expired quotations', () => {
    const quotation = subject({
      status: 'QUOTATION',
      quotationValidUntil: new Date('2026-05-01T00:00:00.000Z')
    });

    expect(isQuotationExpired(quotation, now)).toBe(true);
    expect(() => assertTransition(quotation, permissive, 'CONFIRM', now)).toThrowError(/expired/);
  });

  it('lists only actions allowed for the current status', () => {
    expect(availableActions(subject({ status: 'DRAFT' }), permissive, now)).toEqual(['SUBMIT', 'CANCEL']);
    expect(availableActions(subject({ status: 'ACTIVE' }), permissive, now)).toEqual(['PAUSE', 'CLOSE']);
  });

  it('auto-closes only active subscriptions on auto-close plans', () => {
    const expired = subject({ status: 'ACTIVE', expiryDate: new Date('2026-05-01T00:00:00.000Z') });
    expect(shouldAutoClose(expired, { ...permissive, autoClose: true }, now)).toBe(true);
    expect(shouldAutoClose(expired, { ...permissive, autoClose: false }, now)).toBe(false);
    expect(
      shouldAutoClose(subject({ status: 'PAUSED', expiryDate: new Date('2026-05-01T00:00:00.000Z') }), permissive, now)
    ).toBe(false);
  });
});
