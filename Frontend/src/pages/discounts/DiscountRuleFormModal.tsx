import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Checkbox, Input, Select, Textarea } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../lib/api';
import { apiFieldErrors, describeApiError, zodFieldErrors } from '../../lib/errors';
import { fromDateTimeLocal, toDateTimeLocal } from '../../lib/format';
import type { DiscountRule, DiscountRuleInput, DiscountScope, DiscountType, Product } from '../../types';
import { discountRuleFormSchema } from '../../lib/validation';

interface DiscountFormValues {
  name: string;
  description: string;
  type: DiscountType;
  scope: DiscountScope;
  value: string;
  minPurchase: string;
  minQuantity: string;
  startsAt: string;
  endsAt: string;
  maxUsageCount: string;
  isActive: boolean;
  productId: string;
}

function toValues(rule?: DiscountRule | null): DiscountFormValues {
  return {
    name: rule?.name ?? '',
    description: rule?.description ?? '',
    type: rule?.type ?? 'PERCENTAGE',
    scope: rule?.scope ?? 'SUBSCRIPTION',
    value: rule ? String(rule.value) : '',
    minPurchase: rule ? String(rule.minPurchase) : '0',
    minQuantity: rule ? String(rule.minQuantity) : '0',
    startsAt: toDateTimeLocal(rule?.startsAt),
    endsAt: toDateTimeLocal(rule?.endsAt),
    maxUsageCount: rule?.maxUsageCount == null ? '' : String(rule.maxUsageCount),
    isActive: rule?.isActive ?? true,
    productId: rule?.productId ?? ''
  };
}

export function DiscountRuleFormModal({
  open,
  rule,
  onClose,
  onSaved
}: {
  open: boolean;
  rule?: DiscountRule | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [values, setValues] = useState<DiscountFormValues>(() => toValues(rule));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const productsLoader = () => api.catalog.listProducts();
  const { data: products, loading: loadingProducts, error: productsError } = useAsync(
    productsLoader,
    [open]
  );

  useEffect(() => {
    if (open) {
      setValues(toValues(rule));
      setErrors({});
      setFormError('');
    }
  }, [open, rule]);

  function setValue<K extends keyof DiscountFormValues>(key: K, value: DiscountFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = discountRuleFormSchema.safeParse(values);
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      setFormError('Review the highlighted fields and try again.');
      return;
    }

    const input: DiscountRuleInput = {
      name: result.data.name,
      description: result.data.description || undefined,
      type: values.type,
      scope: values.scope,
      value: result.data.value,
      minPurchase: result.data.minPurchase,
      minQuantity: result.data.minQuantity,
      startsAt: fromDateTimeLocal(values.startsAt) ?? undefined,
      endsAt: fromDateTimeLocal(values.endsAt) ?? undefined,
      maxUsageCount: result.data.maxUsageCount,
      isActive: values.isActive,
      productId: values.scope === 'PRODUCT' ? values.productId : undefined
    };

    setSubmitting(true);
    setFormError('');
    try {
      if (rule) {
        await api.discounts.update(rule.id, {
          ...input,
          description: input.description ?? null,
          startsAt: input.startsAt ?? null,
          endsAt: input.endsAt ?? null,
          maxUsageCount: input.maxUsageCount ?? null,
          productId: input.productId ?? null
        });
        onSaved('Discount rule updated');
      } else {
        await api.discounts.create(input);
        onSaved('Discount rule created');
      }
      onClose();
    } catch (caught) {
      setErrors(apiFieldErrors(caught));
      setFormError(describeApiError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rule ? 'Edit discount rule' : 'Create discount rule'}
      description="Rules are evaluated when an invoice is generated. Only the single eligible rule with the highest saving is applied."
      size="lg"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="discount-rule-form" loading={submitting}>
            {rule ? 'Save changes' : 'Create rule'}
          </Button>
        </>
      }
    >
      <form id="discount-rule-form" className="form-stack" onSubmit={handleSubmit} noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}
        {productsError != null && values.scope === 'PRODUCT' && (
          <Alert tone="error" title="Could not load products">
            {describeApiError(productsError)}
          </Alert>
        )}
        <div className="form-grid">
          <Input
            label="Rule name"
            value={values.name}
            onChange={(event) => setValue('name', event.target.value)}
            error={errors.name}
            maxLength={120}
            data-autofocus
            required
          />
          <Select
            label="Discount type"
            value={values.type}
            onChange={(event) => setValue('type', event.target.value as DiscountType)}
          >
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed amount</option>
          </Select>
          <Select
            label="Applies to"
            value={values.scope}
            onChange={(event) => {
              const scope = event.target.value as DiscountScope;
              setValue('scope', scope);
              if (scope === 'SUBSCRIPTION') setValue('productId', '');
            }}
          >
            <option value="SUBSCRIPTION">Whole subscription</option>
            <option value="PRODUCT">Specific product</option>
          </Select>
          <Input
            label={values.type === 'PERCENTAGE' ? 'Discount percentage' : 'Discount amount'}
            type="number"
            min="0.01"
            max={values.type === 'PERCENTAGE' ? '100' : undefined}
            step="0.01"
            value={values.value}
            onChange={(event) => setValue('value', event.target.value)}
            error={errors.value}
            hint={values.type === 'PERCENTAGE' ? 'Enter a value from 0 to 100.' : 'The amount is capped at the eligible subtotal.'}
            required
          />
          {values.scope === 'PRODUCT' && (
            <Select
              label="Target product"
              value={values.productId}
              onChange={(event) => setValue('productId', event.target.value)}
              error={errors.productId}
              disabled={loadingProducts || !products?.length}
              required
            >
              <option value="">
                {loadingProducts ? 'Loading products…' : 'Select a product'}
              </option>
              {(products ?? []).map((product: Product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
          )}
          <Input
            label="Minimum purchase"
            type="number"
            min="0"
            step="0.01"
            value={values.minPurchase}
            onChange={(event) => setValue('minPurchase', event.target.value)}
            error={errors.minPurchase}
            hint="Eligible subtotal required before the rule applies."
          />
          <Input
            label="Minimum quantity"
            type="number"
            min="0"
            step="1"
            value={values.minQuantity}
            onChange={(event) => setValue('minQuantity', event.target.value)}
            error={errors.minQuantity}
            hint="Use 0 for no quantity threshold."
          />
          <Input
            label="Maximum usage count"
            type="number"
            min="1"
            step="1"
            value={values.maxUsageCount}
            onChange={(event) => setValue('maxUsageCount', event.target.value)}
            error={errors.maxUsageCount}
            hint="Leave blank for unlimited use."
          />
          <Input
            label="Starts at (optional)"
            type="datetime-local"
            value={values.startsAt}
            onChange={(event) => setValue('startsAt', event.target.value)}
            error={errors.startsAt}
          />
          <Input
            label="Ends at (optional)"
            type="datetime-local"
            value={values.endsAt}
            onChange={(event) => setValue('endsAt', event.target.value)}
            error={errors.endsAt}
          />
        </div>
        <Textarea
          label="Description (optional)"
          value={values.description}
          onChange={(event) => setValue('description', event.target.value)}
          error={errors.description}
          maxLength={2000}
          rows={3}
        />
        <Checkbox
          label="Active"
          description="Inactive, expired, or exhausted rules are not applied to new invoices."
          checked={values.isActive}
          onChange={(checked) => setValue('isActive', checked)}
        />
      </form>
    </Modal>
  );
}
