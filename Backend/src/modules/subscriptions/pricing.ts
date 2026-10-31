export type PricedLine = {
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

export type LineTotals = {
  lineAmount: number;
  taxAmount: number;
  total: number;
};

export type SubscriptionTotals = {
  subtotal: number;
  taxTotal: number;
  total: number;
};

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function priceLine(line: PricedLine): LineTotals {
  const lineAmount = roundCurrency(line.quantity * line.unitPrice);
  const taxAmount = roundCurrency((lineAmount * line.taxRate) / 100);

  return {
    lineAmount,
    taxAmount,
    total: roundCurrency(lineAmount + taxAmount)
  };
}

export function summarizeLines(lines: PricedLine[]): SubscriptionTotals {
  return lines.reduce<SubscriptionTotals>(
    (totals, line) => {
      const priced = priceLine(line);
      return {
        subtotal: roundCurrency(totals.subtotal + priced.lineAmount),
        taxTotal: roundCurrency(totals.taxTotal + priced.taxAmount),
        total: roundCurrency(totals.total + priced.total)
      };
    },
    { subtotal: 0, taxTotal: 0, total: 0 }
  );
}
