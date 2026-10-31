import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/FormControls';
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
import { toDateInput } from '../../lib/format';
import { subscriptionEditFormSchema } from '../../lib/validation';
import type {
  PaymentTerm,
  Product,
  Subscription,
  SubscriptionUpdateInput
} from '../../types';

interface SubscriptionEditValues {
  startDate: string;
  expiryDate: string;
  paymentTermId: string;
  notes: string;
  lines: LineItemValues[];
}

function toFormValues(subscription: Subscription): SubscriptionEditValues {
  return {
    startDate: toDateInput(subscription.startDate),
    expiryDate: toDateInput(subscription.expiryDate),
    paymentTermId: subscription.paymentTermId ?? '',
    notes: subscription.notes ?? '',
    lines: subscription.lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId ?? '',
      description: line.description ?? '',
      quantity: String(line.quantity),
      unitPrice: String(line.unitPrice),
      taxRate: String(line.taxRate)
    }))
  };
}

interface SubscriptionEditModalProps {
  open: boolean;
  subscription: Subscription | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function SubscriptionEditModal({
  open,
  subscription,
  onClose,
  onSaved
}: SubscriptionEditModalProps) {
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
  } = useFormState<SubscriptionEditValues>(
    subscription ? toFormValues(subscription) : {
      startDate: '',
      expiryDate: '',
      paymentTermId: '',
      notes: '',
      lines: []
    }
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsError, setRefsError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !subscription) return;

    reset(toFormValues(subscription));
    let active = true;
    setRefsLoading(true);
    setRefsError(null);

    Promise.all([api.catalog.listProducts(), api.paymentTerms.list({ isActive: true })])
      .then(([loadedProducts, loadedTerms]) => {
        if (!active) return;
        setProducts(loadedProducts);
        setPaymentTerms(loadedTerms);
      })
      .catch((caught) => {
        if (active) setRefsError(describeApiError(caught));
      })
      .finally(() => {
        if (active) setRefsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, subscription, reset]);

  const productOptions = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    for (const line of subscription?.lines ?? []) {
      if (line.product && !byId.has(line.product.id)) {
        byId.set(line.product.id, line.product);
      }
    }
    return [...byId.values()];
  }, [products, subscription]);

  const paymentTermOptions = useMemo(() => {
    const byId = new Map(paymentTerms.map((term) => [term.id, term]));
    if (subscription?.paymentTerm && !byId.has(subscription.paymentTerm.id)) {
      byId.set(subscription.paymentTerm.id, subscription.paymentTerm);
    }
    return [...byId.values()];
  }, [paymentTerms, subscription]);

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
    if (!subscription) return;

    const result = subscriptionEditFormSchema.safeParse(values);
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      setFormError('Review the highlighted fields and try again.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const notes = result.data.notes?.trim() ?? '';
    const payload: SubscriptionUpdateInput = {
      startDate: result.data.startDate,
      expiryDate: result.data.expiryDate || null,
      paymentTermId: result.data.paymentTermId ?? null,
      notes: notes || null,
      lines: result.data.lines.map((line) => ({
        productId: line.productId,
        ...(line.variantId ? { variantId: line.variantId } : {}),
        ...(line.description ? { description: line.description } : {}),
        quantity: line.quantity,
        ...(line.unitPrice !== undefined ? { unitPrice: line.unitPrice } : {}),
        taxRate: line.taxRate
      }))
    };

    try {
      await api.subscriptions.update(subscription.id, payload);
      onSaved('Subscription updated');
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
      title="Edit subscription"
      description="Update dates, payment terms, notes, or product lines while this subscription is still a draft or quotation."
      size="lg"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="subscription-edit-form" loading={submitting}>
            Save changes
          </Button>
        </>
      }
    >
      <form
        id="subscription-edit-form"
        className="form-stack"
        onSubmit={handleSubmit}
        noValidate
      >
        {formError && <Alert tone="error">{formError}</Alert>}
        {refsError && <Alert tone="error" title="Could not load form options">{refsError}</Alert>}
        {refsLoading && <Alert tone="info">Loading products and payment terms…</Alert>}

        <section className="form-section">
          <div className="form-section-heading">
            <h3>Schedule &amp; terms</h3>
            <p>Adjust the billing window and how invoices fall due.</p>
          </div>
          <div className="form-grid">
            <Input
              label="Start date"
              name="startDate"
              type="date"
              value={values.startDate}
              onChange={(event) => setValue('startDate', event.target.value)}
              error={errors.startDate}
              required
            />
            <Input
              label="Expiry date"
              name="expiryDate"
              type="date"
              value={values.expiryDate}
              onChange={(event) => setValue('expiryDate', event.target.value)}
              error={errors.expiryDate}
              hint="Leave blank for an open-ended subscription."
            />
            <Select
              label="Payment term"
              name="paymentTermId"
              value={values.paymentTermId}
              onChange={(event) => setValue('paymentTermId', event.target.value)}
              error={errors.paymentTermId}
            >
              <option value="">No payment term</option>
              {paymentTermOptions.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                  {term.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            label="Internal notes"
            name="notes"
            rows={3}
            placeholder="Anything the team should know about this subscription…"
            value={values.notes}
            onChange={(event) => setValue('notes', event.target.value)}
            error={errors.notes}
          />
        </section>

        <LineItemsEditor
          products={productOptions}
          lines={values.lines}
          errors={errors}
          onChange={updateLine}
          onAdd={addLine}
          onRemove={removeLine}
          showDescription
          title="Subscription lines"
          description="Products, quantities, and pricing for this subscription."
          emptyMessage="Add at least one product line."
        />
      </form>
    </Modal>
  );
}
