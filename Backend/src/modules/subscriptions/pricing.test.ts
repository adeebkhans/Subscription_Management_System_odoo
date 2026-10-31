import { describe, expect, it } from 'vitest';
import { priceLine, roundCurrency, summarizeLines } from './pricing.js';

describe('priceLine', () => {
  it('computes line amount and tax', () => {
    expect(priceLine({ quantity: 3, unitPrice: 1500, taxRate: 18 })).toEqual({
      lineAmount: 4500,
      taxAmount: 810,
      total: 5310
    });
  });

  it('rounds to two decimals', () => {
    expect(priceLine({ quantity: 3, unitPrice: 19.995, taxRate: 5 })).toEqual({
      lineAmount: 59.99,
      taxAmount: 3,
      total: 62.99
    });
  });
});

describe('summarizeLines', () => {
  it('totals subtotal, tax, and total across lines', () => {
    expect(
      summarizeLines([
        { quantity: 2, unitPrice: 100, taxRate: 10 },
        { quantity: 1, unitPrice: 50, taxRate: 0 }
      ])
    ).toEqual({ subtotal: 250, taxTotal: 20, total: 270 });
  });

  it('returns zeroes for no lines', () => {
    expect(summarizeLines([])).toEqual({ subtotal: 0, taxTotal: 0, total: 0 });
  });
});

describe('roundCurrency', () => {
  it('avoids floating point drift', () => {
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
  });
});
