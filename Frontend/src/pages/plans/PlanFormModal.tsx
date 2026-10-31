import { useEffect } from 'react';
import type { FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Checkbox, Input, Select } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { useFormState } from '../../hooks/useFormState';
import { api } from '../../lib/api';
import { apiFieldErrors, describeApiError, zodFieldErrors } from '../../lib/errors';
import { fromDateTimeLocal, toDateTimeLocal } from '../../lib/format';
import { planFormSchema } from '../../lib/validation';
import type { BillingFrequency, Plan, PlanInput } from '../../types';

interface PlanFormValues {
  name: string;
  price: string;
  frequency: BillingFrequency;
  minimumQuantity: string;
  availableFrom: string;
  availableUntil: string;
  autoClose: boolean;
  allowEarlyClose: boolean;
  allowPause: boolean;
  allowRenew: boolean;
}

function toFormValues(plan?: Plan | null): PlanFormValues {
  return {
    name: plan?.name ?? '',
    price: plan ? String(plan.price) : '',
    frequency: plan?.frequency ?? 'MONTHLY',
    minimumQuantity: plan ? String(plan.minimumQuantity) : '1',
    availableFrom: toDateTimeLocal(plan?.availableFrom),
    availableUntil: toDateTimeLocal(plan?.availableUntil),
    autoClose: plan?.autoClose ?? false,
    allowEarlyClose: plan?.allowEarlyClose ?? true,
    allowPause: plan?.allowPause ?? true,
    allowRenew: plan?.allowRenew ?? true
  };
}

interface PlanFormModalProps {
  open: boolean;
  plan?: Plan | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function PlanFormModal({ open, plan, onClose, onSaved }: PlanFormModalProps) {
  const {
    values,
    errors,
    setErrors,
    formError,
    setFormError,
    submitting,
    setSubmitting,
    setValue,
    reset
  } = useFormState<PlanFormValues>(toFormValues(plan));

  useEffect(() => {
    if (open) {
      reset(toFormValues(plan));
    }
  }, [open, plan, reset]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = planFormSchema.safeParse(values);
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      setFormError('Review the highlighted fields and try again.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const availableFrom = fromDateTimeLocal(result.data.availableFrom ?? '');
    const availableUntil = fromDateTimeLocal(result.data.availableUntil ?? '');
    const base = {
      name: result.data.name,
      price: result.data.price,
      frequency: result.data.frequency,
      minimumQuantity: result.data.minimumQuantity,
      autoClose: result.data.autoClose,
      allowEarlyClose: result.data.allowEarlyClose,
      allowPause: result.data.allowPause,
      allowRenew: result.data.allowRenew
    };

    try {
      if (plan) {
        await api.catalog.updatePlan(plan.id, {
          ...base,
          availableFrom,
          availableUntil
        });
        onSaved('Plan updated');
      } else {
        const payload: PlanInput = {
          ...base,
          ...(availableFrom ? { availableFrom } : {}),
          ...(availableUntil ? { availableUntil } : {})
        };
        await api.catalog.createPlan(payload);
        onSaved('Plan created');
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
      title={plan ? 'Edit plan' : 'New plan'}
      description={
        plan
          ? 'Adjust pricing, availability, or lifecycle policies for this plan.'
          : 'Create a subscription plan with pricing, billing cadence, and lifecycle rules.'
      }
      size="lg"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="plan-form" loading={submitting}>
            {plan ? 'Save changes' : 'Create plan'}
          </Button>
        </>
      }
    >
      <form id="plan-form" className="form-stack" onSubmit={handleSubmit} noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}

        <section className="form-section">
          <div className="form-section-heading">
            <h3>Plan details</h3>
            <p>The commercial basics for this subscription plan.</p>
          </div>
          <div className="form-grid">
            <Input
              label="Plan name"
              name="name"
              placeholder="Monthly Business"
              value={values.name}
              onChange={(event) => setValue('name', event.target.value)}
              error={errors.name}
              data-autofocus
              required
            />
            <Input
              label="Price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="1500.00"
              value={values.price}
              onChange={(event) => setValue('price', event.target.value)}
              error={errors.price}
              required
            />
            <Select
              label="Billing frequency"
              name="frequency"
              value={values.frequency}
              onChange={(event) =>
                setValue('frequency', event.target.value as BillingFrequency)
              }
              error={errors.frequency}
              required
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </Select>
            <Input
              label="Minimum quantity"
              name="minimumQuantity"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              placeholder="1"
              value={values.minimumQuantity}
              onChange={(event) => setValue('minimumQuantity', event.target.value)}
              error={errors.minimumQuantity}
              hint="The smallest quantity a subscription can start with."
              required
            />
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <h3>Availability window</h3>
            <p>Optional dates that control when the plan can be sold.</p>
          </div>
          <div className="form-grid">
            <Input
              label="Available from"
              name="availableFrom"
              type="datetime-local"
              value={values.availableFrom}
              onChange={(event) => setValue('availableFrom', event.target.value)}
              error={errors.availableFrom}
            />
            <Input
              label="Available until"
              name="availableUntil"
              type="datetime-local"
              value={values.availableUntil}
              onChange={(event) => setValue('availableUntil', event.target.value)}
              error={errors.availableUntil}
            />
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <h3>Lifecycle policies</h3>
            <p>Decide what customers and staff can do with a subscription.</p>
          </div>
          <div className="checkbox-grid">
            <Checkbox
              label="Auto close"
              description="Close automatically when the plan period ends."
              checked={values.autoClose}
              onChange={(checked) => setValue('autoClose', checked)}
            />
            <Checkbox
              label="Allow early close"
              description="End a subscription before its expiry date."
              checked={values.allowEarlyClose}
              onChange={(checked) => setValue('allowEarlyClose', checked)}
            />
            <Checkbox
              label="Allow pause"
              description="Pause an active subscription temporarily."
              checked={values.allowPause}
              onChange={(checked) => setValue('allowPause', checked)}
            />
            <Checkbox
              label="Allow renew"
              description="Renew at the end of each billing cycle."
              checked={values.allowRenew}
              onChange={(checked) => setValue('allowRenew', checked)}
            />
          </div>
        </section>
      </form>
    </Modal>
  );
}
