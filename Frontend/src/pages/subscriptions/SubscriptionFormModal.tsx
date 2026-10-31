import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import {
  LineItemsEditor,
  emptyLineItem,
  lineItemFromProduct,
  type LineItemValues
} from '../../components/forms/LineItemsEditor';
import { useAuth } from '../../auth/AuthContext';
import { useFormState } from '../../hooks/useFormState';
import { api } from '../../lib/api';
import { apiFieldErrors, describeApiError, zodFieldErrors } from '../../lib/errors';
import { formatMoney, todayInput } from '../../lib/format';
import { subscriptionFormSchema } from '../../lib/validation';
import type {
  CustomerOption,
  PaymentTerm,
  Plan,
  Product,
  QuotationTemplate,
  Subscription,
  SubscriptionInput
} from '../../types';

type SubscriptionSource = 'PLAN' | 'TEMPLATE';

interface SubscriptionFormValues {
  customerId: string;
  source: SubscriptionSource;
  planId: string;
  quotationTemplateId: string;
  startDate: string;
  expiryDate: string;
  paymentTermId: string;
  notes: string;
  lines: LineItemValues[];
}

function initialValues(): SubscriptionFormValues {
  return {
    customerId: '',
    source: 'PLAN',
    planId: '',
    quotationTemplateId: '',
    startDate: todayInput(),
    expiryDate: '',
    paymentTermId: '',
    notes: '',
    lines: []
  };
}

interface SubscriptionFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (subscription: Subscription) => void;
}

export function SubscriptionFormModal({ open, onClose, onCreated }: SubscriptionFormModalProps) {
  const { user } = useAuth();
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
  } = useFormState<SubscriptionFormValues>(initialValues());

  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [manualCustomer, setManualCustomer] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsError, setRefsError] = useState<string | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [templateDetail, setTemplateDetail] = useState<QuotationTemplate | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (!open) {
      seeded.current = false;
      return;
    }

    reset(initialValues());
    setManualCustomer(false);
    setTemplateDetail(null);
    setTemplateError(null);
    let active = true;
    setRefsLoading(true);
    setRefsError(null);
    setCustomerError(null);

    const customerLoader: Promise<CustomerOption[]> =
      user?.role === 'ADMIN'
        ? api.users.listCustomers().then((users) =>
            users.map((entry) => ({ id: entry.id, name: entry.name, email: entry.email }))
          )
        : api.subscriptions.list().then((subscriptions) => {
            const byId = new Map<string, CustomerOption>();
            for (const subscription of subscriptions) {
              if (!byId.has(subscription.customer.id)) {
                byId.set(subscription.customer.id, subscription.customer);
              }
            }
            return [...byId.values()];
          });

    Promise.all([
      api.catalog.listProducts(),
      api.catalog.listPlans(),
      api.quotations.list({ isActive: true }),
      api.paymentTerms.list({ isActive: true }),
      customerLoader
    ])
      .then(([loadedProducts, loadedPlans, loadedTemplates, loadedTerms, loadedCustomers]) => {
        if (!active) return;
        setProducts(loadedProducts);
        setPlans(loadedPlans);
        setTemplates(loadedTemplates);
        setPaymentTerms(loadedTerms);
        setCustomers(loadedCustomers);
        if (user?.role !== 'ADMIN' && loadedCustomers.length === 0) {
          setManualCustomer(true);
        }
      })
      .catch((caught) => {
        if (active) {
          setCustomerError(describeApiError(caught));
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
  }, [open, reset, user?.role]);

  useEffect(() => {
    if (!open || values.source !== 'TEMPLATE' || !values.quotationTemplateId) {
      setTemplateDetail(null);
      setTemplateError(null);
      return;
    }

    let active = true;
    setTemplateLoading(true);
    setTemplateError(null);
    api.quotations
      .get(values.quotationTemplateId)
      .then((template) => {
        if (active) setTemplateDetail(template);
      })
      .catch((caught) => {
        if (active) setTemplateError(describeApiError(caught));
      })
      .finally(() => {
        if (active) setTemplateLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, values.source, values.quotationTemplateId]);

  useEffect(() => {
    if (!open || refsLoading || seeded.current) return;
    if (values.source !== 'PLAN') {
      seeded.current = true;
      return;
    }
    if (products.length === 0) return;

    seeded.current = true;
    setValues((current) =>
      current.lines.length > 0
        ? current
        : { ...current, lines: [lineItemFromProduct(products[0])] }
    );
  }, [open, refsLoading, values.source, products, setValues]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === values.planId) ?? null,
    [plans, values.planId]
  );

  function updateLine(index: number, field: keyof LineItemValues, value: string) {
    setValues((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        if (field === 'productId') {
          const product = products.find((entry) => entry.id === value);
          return {
            ...line,
            productId: value,
            variantId: '',
            unitPrice: product ? String(product.salesPrice) : ''
          };
        }
        if (field === 'variantId') {
          const product = products.find((entry) => entry.id === line.productId);
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
      lines: [...current.lines, products[0] ? lineItemFromProduct(products[0]) : emptyLineItem()]
    }));
  }

  function removeLine(index: number) {
    setValues((current) => ({
      ...current,
      lines: current.lines.filter((_, lineIndex) => lineIndex !== index)
    }));
  }

  function changeSource(source: SubscriptionSource) {
    setValues((current) => ({ ...current, source }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate =
      values.source === 'TEMPLATE' ? { ...values, lines: [] as LineItemValues[] } : values;
    const result = subscriptionFormSchema.safeParse(candidate);
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      setFormError('Review the highlighted fields and try again.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const notes = result.data.notes?.trim() ?? '';
    const base = {
      customerId: result.data.customerId,
      startDate: result.data.startDate,
      ...(result.data.expiryDate ? { expiryDate: result.data.expiryDate } : {}),
      ...(result.data.paymentTermId ? { paymentTermId: result.data.paymentTermId } : {}),
      ...(notes ? { notes } : {})
    };

    try {
      let payload: SubscriptionInput;
      if (result.data.source === 'TEMPLATE') {
        payload = {
          ...base,
          quotationTemplateId: result.data.quotationTemplateId
        };
      } else {
        payload = {
          ...base,
          planId: result.data.planId,
          lines: result.data.lines.map((line) => ({
            productId: line.productId,
            ...(line.variantId ? { variantId: line.variantId } : {}),
            ...(line.description ? { description: line.description } : {}),
            quantity: line.quantity,
            ...(line.unitPrice !== undefined ? { unitPrice: line.unitPrice } : {}),
            taxRate: line.taxRate
          }))
        };
      }

      const subscription = await api.subscriptions.create(payload);
      onCreated(subscription);
      onClose();
    } catch (caught) {
      setErrors(apiFieldErrors(caught));
      setFormError(describeApiError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  const isStaff = user?.role === 'STAFF';
  const canChooseKnownCustomer = customers.length > 0;
  const showManualCustomer = isStaff && (manualCustomer || !canChooseKnownCustomer);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New subscription"
      description="Create a draft or quotation from a plan or a reusable quotation template."
      size="lg"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="subscription-form"
            loading={submitting}
            disabled={refsLoading}
          >
            Create subscription
          </Button>
        </>
      }
    >
      <form id="subscription-form" className="form-stack" onSubmit={handleSubmit} noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}
        {refsError && <Alert tone="error" title="Could not load form options">{refsError}</Alert>}
        {customerError && (
          <Alert tone="warning" title="Customer directory unavailable">
            {customerError}
            {isStaff ? ' Enter a customer ID manually below.' : ''}
          </Alert>
        )}
        {isStaff && (
          <Alert tone="info" title="Staff customer lookup">
            The customer directory is admin-only. Pick a customer from existing subscriptions or
            paste a customer UUID supplied by an administrator.
          </Alert>
        )}
        {refsLoading && <Alert tone="info">Loading plans, products, and templates…</Alert>}

        <section className="form-section">
          <div className="form-section-heading">
            <h3>Customer &amp; source</h3>
            <p>Choose who the subscription is for and what it is built from.</p>
          </div>
          <div className="form-grid">
            {showManualCustomer ? (
              <Input
                label="Customer ID"
                name="customerId"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={values.customerId}
                onChange={(event) => setValue('customerId', event.target.value.trim())}
                error={errors.customerId}
                hint="Paste the customer UUID provided by an administrator."
                data-autofocus
                required
              />
            ) : (
              <Select
                label="Customer"
                name="customerId"
                value={
                  isStaff && manualCustomer && !values.customerId ? '__manual__' : values.customerId
                }
                onChange={(event) => {
                  if (event.target.value === '__manual__') {
                    setManualCustomer(true);
                    setValue('customerId', '');
                    return;
                  }
                  setValue('customerId', event.target.value);
                }}
                error={errors.customerId}
                disabled={refsLoading}
                data-autofocus
                required
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} — {customer.email}
                  </option>
                ))}
                {isStaff && <option value="__manual__">Enter customer ID manually…</option>}
              </Select>
            )}
            <Select
              label="Create from"
              name="source"
              value={values.source}
              onChange={(event) => changeSource(event.target.value as SubscriptionSource)}
            >
              <option value="PLAN">Plan and product lines</option>
              <option value="TEMPLATE">Quotation template</option>
            </Select>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <h3>Commercial setup</h3>
            <p>Plan, billing dates, and payment terms for this subscription.</p>
          </div>
          <div className="form-grid">
            {values.source === 'PLAN' ? (
              <Select
                label="Plan"
                name="planId"
                value={values.planId}
                onChange={(event) => setValue('planId', event.target.value)}
                error={errors.planId}
                hint={
                  selectedPlan
                    ? `Minimum quantity per line: ${selectedPlan.minimumQuantity}.`
                    : 'Choose the plan that governs pricing and lifecycle rules.'
                }
                required
              >
                <option value="">Select plan</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — {formatMoney(plan.price)}
                  </option>
                ))}
              </Select>
            ) : (
              <Select
                label="Quotation template"
                name="quotationTemplateId"
                value={values.quotationTemplateId}
                onChange={(event) => setValue('quotationTemplateId', event.target.value)}
                error={errors.quotationTemplateId}
                hint="The template supplies the plan, products, and quotation validity."
                required
              >
                <option value="">Select template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} — {template.lines.length} lines
                  </option>
                ))}
              </Select>
            )}
            <Select
              label="Payment term"
              name="paymentTermId"
              value={values.paymentTermId}
              onChange={(event) => setValue('paymentTermId', event.target.value)}
            >
              <option value="">No payment term</option>
              {paymentTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </Select>
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
              hint="Optional. Leave blank for an open-ended subscription."
            />
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

        {values.source === 'PLAN' ? (
          <LineItemsEditor
            products={products}
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
        ) : (
          <TemplatePreview
            loading={templateLoading}
            error={templateError}
            template={templateDetail}
          />
        )}
      </form>
    </Modal>
  );
}

function TemplatePreview({
  template,
  loading,
  error
}: {
  template: QuotationTemplate | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <section className="form-section">
      <div className="form-section-heading">
        <h3>Template preview</h3>
        <p>The subscription will copy this template’s plan and product lines.</p>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {loading ? <p className="detail-empty">Loading template…</p> : null}
      {!loading && !error && !template ? (
        <p className="detail-empty">Select a quotation template to preview its lines.</p>
      ) : null}
      {template && !loading && !error ? (
        <div className="detail-stack">
          <div className="detail-grid">
            <div>
              <span>Plan</span>
              <strong>{template.plan?.name ?? 'No plan'}</strong>
            </div>
            <div>
              <span>Validity</span>
              <strong>{template.validityDays} days</strong>
            </div>
            <div>
              <span>Lines</span>
              <strong>{template.lines.length}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>
                <Badge tone={template.isActive ? 'success' : 'danger'}>
                  {template.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </strong>
            </div>
          </div>
          <div className="mini-table-wrap">
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Tax</th>
                </tr>
              </thead>
              <tbody>
                {template.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.product?.name ?? 'Product'}</td>
                    <td>
                      {line.variant
                        ? `${line.variant.attribute}: ${line.variant.value}`
                        : 'Base price'}
                    </td>
                    <td>{line.quantity}</td>
                    <td>
                      {formatMoney(
                        line.unitPrice === null
                          ? Number(line.product?.salesPrice ?? 0) +
                              Number(line.variant?.extraPrice ?? 0)
                          : line.unitPrice
                      )}
                    </td>
                    <td>{Number(line.taxRate)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
