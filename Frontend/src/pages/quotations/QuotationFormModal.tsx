import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Checkbox, Input, Select, Textarea } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import {
  LineItemsEditor,
  emptyLineItem,
  lineItemFromProduct,
  type LineItemValues
} from '../../components/forms/LineItemsEditor';
import { useFormState } from '../../hooks/useFormState';
import { api } from '../../lib/api';
import { apiFieldErrors, describeApiError, zodFieldErrors } from '../../lib/errors';
import { formatMoney, frequencySuffix } from '../../lib/format';
import { quotationFormSchema } from '../../lib/validation';
import type { Plan, Product, QuotationInput, QuotationTemplate, QuotationUpdateInput } from '../../types';

interface QuotationFormValues {
  name: string;
  description: string;
  validityDays: string;
  planId: string;
  isActive: boolean;
  lines: LineItemValues[];
}

function toFormValues(quotation?: QuotationTemplate | null): QuotationFormValues {
  return {
    name: quotation?.name ?? '',
    description: quotation?.description ?? '',
    validityDays: quotation ? String(quotation.validityDays) : '30',
    planId: quotation?.planId ?? '',
    isActive: quotation?.isActive ?? true,
    lines:
      quotation?.lines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId ?? '',
        description: '',
        quantity: String(line.quantity),
        unitPrice: line.unitPrice === null ? '' : String(line.unitPrice),
        taxRate: String(line.taxRate)
      })) ?? []
  };
}

interface QuotationFormModalProps {
  open: boolean;
  quotation?: QuotationTemplate | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function QuotationFormModal({
  open,
  quotation,
  onClose,
  onSaved
}: QuotationFormModalProps) {
  const {
    values,
    setValues,
    errors,
    setErrors,
    formError,
    setFormError,
    submitting,
    setSubmitting,
    setValue,
    reset
  } = useFormState<QuotationFormValues>(toFormValues(quotation));

  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsError, setRefsError] = useState<string | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (!open) {
      seeded.current = false;
      return;
    }

    reset(toFormValues(quotation));
    let active = true;
    setRefsLoading(true);
    setRefsError(null);

    Promise.all([api.catalog.listProducts(), api.catalog.listPlans()])
      .then(([loadedProducts, loadedPlans]) => {
        if (active) {
          setProducts(loadedProducts);
          setPlans(loadedPlans);
        }
      })
      .catch((caught) => {
        if (active) {
          setRefsError(describeApiError(caught));
        }
      })
      .finally(() => {
        if (active) {
          setRefsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, quotation, reset]);

  const productOptions = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    for (const line of quotation?.lines ?? []) {
      if (line.product && !byId.has(line.product.id)) {
        byId.set(line.product.id, line.product);
      }
    }
    return [...byId.values()];
  }, [products, quotation]);

  const planOptions = useMemo(() => {
    const byId = new Map(plans.map((plan) => [plan.id, plan]));
    if (quotation?.plan && !byId.has(quotation.plan.id)) {
      byId.set(quotation.plan.id, quotation.plan);
    }
    return [...byId.values()];
  }, [plans, quotation]);

  useEffect(() => {
    if (!open || refsLoading || seeded.current) return;
    if (quotation) {
      seeded.current = true;
      return;
    }
    if (productOptions.length === 0) return;

    seeded.current = true;
    setValues((current) =>
      current.lines.length > 0
        ? current
        : { ...current, lines: [lineItemFromProduct(productOptions[0])] }
    );
  }, [open, refsLoading, quotation, productOptions, setValues]);

  function updateLine(index: number, field: keyof LineItemValues, value: string) {
    setValues((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        if (field === 'productId') {
          const product = productOptions.find((entry) => entry.id === value);
          return {
            ...line,
            productId: value,
            variantId: '',
            unitPrice: product ? String(product.salesPrice) : ''
          };
        }
        if (field === 'variantId') {
          const product = productOptions.find((entry) => entry.id === line.productId);
          const variant = product?.variants.find((entry) => entry.id === value);
          return {
            ...line,
            variantId: value,
            unitPrice: product
              ? String(Number(product.salesPrice) + Number(variant?.extraPrice ?? 0))
              : line.unitPrice
          };
        }
        return { ...line, [field]: value };
      })
    }));

    setErrors((current) => {
      const key = `lines.${index}.${field}`;
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function addLine() {
    setValues((current) => ({
      ...current,
      lines: [
        ...current.lines,
        productOptions[0] ? lineItemFromProduct(productOptions[0]) : emptyLineItem()
      ]
    }));
  }

  function removeLine(index: number) {
    setValues((current) => ({
      ...current,
      lines: current.lines.filter((_, lineIndex) => lineIndex !== index)
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = quotationFormSchema.safeParse(values);
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      setFormError('Review the highlighted fields and try again.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const lines = result.data.lines.map((line, index) => ({
      productId: line.productId,
      ...(line.variantId ? { variantId: line.variantId } : {}),
      quantity: line.quantity,
      ...(line.unitPrice !== undefined ? { unitPrice: line.unitPrice } : {}),
      taxRate: line.taxRate,
      sortOrder: index
    }));
    const description = result.data.description?.trim() ?? '';

    try {
      if (quotation) {
        const payload: QuotationUpdateInput = {
          name: result.data.name,
          description: description || null,
          validityDays: result.data.validityDays,
          planId: result.data.planId ?? null,
          isActive: result.data.isActive,
          lines
        };
        await api.quotations.update(quotation.id, payload);
        onSaved('Quotation template updated');
      } else {
        const payload: QuotationInput = {
          name: result.data.name,
          ...(description ? { description } : {}),
          validityDays: result.data.validityDays,
          ...(result.data.planId ? { planId: result.data.planId } : {}),
          isActive: result.data.isActive,
          lines
        };
        await api.quotations.create(payload);
        onSaved('Quotation template created');
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
      title={quotation ? 'Edit quotation template' : 'New quotation template'}
      description={
        quotation
          ? 'Update validity, plan association, and product lines for this template.'
          : 'Bundle products and validity rules into a reusable quotation template.'
      }
      size="lg"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="quotation-form"
            loading={submitting}
            disabled={refsLoading}
          >
            {quotation ? 'Save changes' : 'Create template'}
          </Button>
        </>
      }
    >
      <form id="quotation-form" className="form-stack" onSubmit={handleSubmit} noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}
        {refsError && <Alert tone="error" title="Could not load form options">{refsError}</Alert>}
        {refsLoading && <Alert tone="info">Loading products and plans…</Alert>}

        <section className="form-section">
          <div className="form-section-heading">
            <h3>Template details</h3>
            <p>Give the template a clear name and a validity window.</p>
          </div>
          <div className="form-grid">
            <Input
              label="Template name"
              name="name"
              placeholder="Standard onboarding package"
              value={values.name}
              onChange={(event) => setValue('name', event.target.value)}
              error={errors.name}
              data-autofocus
              required
            />
            <Input
              label="Validity days"
              name="validityDays"
              type="number"
              min="1"
              max="365"
              step="1"
              inputMode="numeric"
              value={values.validityDays}
              onChange={(event) => setValue('validityDays', event.target.value)}
              error={errors.validityDays}
              hint="How long a generated quotation stays valid."
              required
            />
            <Select
              label="Plan"
              name="planId"
              value={values.planId}
              onChange={(event) => setValue('planId', event.target.value)}
              error={errors.planId}
              hint="Optional. The plan is inferred from the template when attached."
            >
              <option value="">No plan</option>
              {planOptions.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — {formatMoney(plan.price)}
                  {frequencySuffix(plan.frequency)}
                </option>
              ))}
            </Select>
            <div className="form-checkbox-cell">
              <Checkbox
                label="Active"
                description="Inactive templates cannot be attached to new subscriptions."
                checked={values.isActive}
                onChange={(checked) => setValue('isActive', checked)}
              />
            </div>
          </div>
          <Textarea
            label="Description"
            name="description"
            rows={3}
            placeholder="What this quotation includes…"
            value={values.description}
            onChange={(event) => setValue('description', event.target.value)}
            error={errors.description}
            hint="Up to 4,000 characters."
          />
        </section>

        <LineItemsEditor
          products={productOptions}
          lines={values.lines}
          errors={errors}
          onChange={updateLine}
          onAdd={addLine}
          onRemove={removeLine}
          title="Quotation lines"
          description="Products and quantities included in this template."
          emptyMessage="Add at least one product line to this quotation."
        />
      </form>
    </Modal>
  );
}
