import { roundCurrency } from '../subscriptions/pricing.js';

export type DiscountableLine = {
  productId: string;
  quantity: number;
  lineAmount: number;
};

export type DiscountRuleCandidate = {
  id: string;
  name: string;
  type: 'FIXED' | 'PERCENTAGE';
  scope: 'PRODUCT' | 'SUBSCRIPTION';
  value: number;
  minPurchase: number;
  minQuantity: number;
  productId: string | null;
  maxUsageCount: number | null;
  usageCount: number;
};

export type DiscountApplication = {
  rule: DiscountRuleCandidate;
  amount: number;
};

export function selectBestDiscount(
  rules: DiscountRuleCandidate[],
  lines: DiscountableLine[]
): DiscountApplication | null {
  const applications = rules.flatMap((rule) => {
    if (
      rule.maxUsageCount !== null &&
      rule.usageCount >= rule.maxUsageCount
    ) {
      return [];
    }

    const applicableLines =
      rule.scope === 'PRODUCT'
        ? lines.filter((line) => line.productId === rule.productId)
        : lines;
    const base = roundCurrency(applicableLines.reduce((sum, line) => sum + line.lineAmount, 0));
    const quantity = applicableLines.reduce((sum, line) => sum + line.quantity, 0);

    if (base < rule.minPurchase || quantity < rule.minQuantity || base <= 0) {
      return [];
    }

    const amount =
      rule.type === 'FIXED'
        ? Math.min(roundCurrency(rule.value), base)
        : roundCurrency((base * rule.value) / 100);

    return amount > 0 ? [{ rule, amount }] : [];
  });

  return applications.sort((left, right) => {
    if (right.amount !== left.amount) return right.amount - left.amount;
    return left.rule.id.localeCompare(right.rule.id);
  })[0] ?? null;
}
