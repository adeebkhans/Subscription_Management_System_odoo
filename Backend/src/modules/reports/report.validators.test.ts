import { describe, expect, it } from 'vitest';
import { calculateBalanceDue } from './report.services.js';
import { financeReportQuerySchema, overdueInvoiceQuerySchema } from './report.validators.js';

describe('report validators', () => {
  it('accepts bounded finance filters and defaults asOf later in the service', () => {
    const result = financeReportQuerySchema.safeParse({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.999Z',
      status: 'CONFIRMED'
    });

    expect(result.success).toBe(true);
  });

  it('rejects a report period whose end precedes its start', () => {
    const result = financeReportQuerySchema.safeParse({
      from: '2026-02-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.999Z'
    });

    expect(result.success).toBe(false);
  });

  it('applies shared pagination defaults to overdue invoice reports', () => {
    const result = overdueInvoiceQuerySchema.parse({});

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('never reports a negative balance due', () => {
    expect(calculateBalanceDue({ total: 100, amountPaid: 125 })).toBe(0);
    expect(calculateBalanceDue({ total: 199.999, amountPaid: 100 })).toBe(100);
  });
});
