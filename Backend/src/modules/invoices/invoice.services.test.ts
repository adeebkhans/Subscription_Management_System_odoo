import { describe, expect, it } from 'vitest';
import { invoicePeriod } from './invoice.services.js';

describe('invoicePeriod', () => {
  it('creates a monthly period ending immediately before the next cycle', () => {
    const period = invoicePeriod(new Date('2026-01-15T10:00:00.000Z'), 'MONTHLY');

    expect(period.periodStart.toISOString()).toBe('2026-01-15T10:00:00.000Z');
    expect(period.periodEnd.toISOString()).toBe('2026-02-15T09:59:59.999Z');
  });

  it('honors a shortened final period', () => {
    const period = invoicePeriod(
      new Date('2026-01-15T10:00:00.000Z'),
      'MONTHLY',
      new Date('2026-01-31T23:59:59.999Z')
    );

    expect(period.periodEnd.toISOString()).toBe('2026-01-31T23:59:59.999Z');
  });

  it('clamps month-end anchors to the last day of shorter months', () => {
    const period = invoicePeriod(new Date('2026-01-31T10:00:00.000Z'), 'MONTHLY');

    expect(period.periodEnd.toISOString()).toBe('2026-02-28T09:59:59.999Z');
  });

  it('rejects a period that does not advance in time', () => {
    expect(() =>
      invoicePeriod(
        new Date('2026-01-15T10:00:00.000Z'),
        'MONTHLY',
        new Date('2026-01-15T10:00:00.000Z')
      )
    ).toThrowError('Invoice period end must be after period start');
  });
});
