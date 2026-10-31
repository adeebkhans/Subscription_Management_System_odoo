import { useEffect } from 'react';
import type { FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Checkbox, Input } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { useFormState } from '../../hooks/useFormState';
import { api } from '../../lib/api';
import { apiFieldErrors, describeApiError, zodFieldErrors } from '../../lib/errors';
import { paymentTermFormSchema } from '../../lib/validation';
import type { PaymentTerm } from '../../types';

interface PaymentTermFormValues {
  name: string;
  dueDays: string;
  isActive: boolean;
}

function toFormValues(term?: PaymentTerm | null): PaymentTermFormValues {
  return {
    name: term?.name ?? '',
    dueDays: term ? String(term.dueDays) : '0',
    isActive: term?.isActive ?? true
  };
}

interface PaymentTermFormModalProps {
  open: boolean;
  term?: PaymentTerm | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function PaymentTermFormModal({
  open,
  term,
  onClose,
  onSaved
}: PaymentTermFormModalProps) {
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
  } = useFormState<PaymentTermFormValues>(toFormValues(term));

  useEffect(() => {
    if (open) {
      reset(toFormValues(term));
    }
  }, [open, term, reset]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = paymentTermFormSchema.safeParse(values);
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      setFormError('Review the highlighted fields and try again.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      name: result.data.name,
      dueDays: result.data.dueDays,
      isActive: result.data.isActive
    };

    try {
      if (term) {
        await api.paymentTerms.update(term.id, payload);
        onSaved('Payment term updated');
      } else {
        await api.paymentTerms.create(payload);
        onSaved('Payment term created');
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
      title={term ? 'Edit payment term' : 'New payment term'}
      description={
        term
          ? 'Adjust the due window or availability of this payment term.'
          : 'Create a due-date rule that can be attached to subscriptions.'
      }
      size="md"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="payment-term-form" loading={submitting}>
            {term ? 'Save changes' : 'Create payment term'}
          </Button>
        </>
      }
    >
      <form id="payment-term-form" className="form-stack" onSubmit={handleSubmit} noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}

        <section className="form-section">
          <div className="form-section-heading">
            <h3>Payment term details</h3>
            <p>The due window is counted from the subscription start date.</p>
          </div>
          <div className="form-grid">
            <Input
              label="Payment term name"
              name="name"
              placeholder="Net 30"
              value={values.name}
              onChange={(event) => setValue('name', event.target.value)}
              error={errors.name}
              data-autofocus
              required
            />
            <Input
              label="Due days"
              name="dueDays"
              type="number"
              min="0"
              max="365"
              step="1"
              inputMode="numeric"
              value={values.dueDays}
              onChange={(event) => setValue('dueDays', event.target.value)}
              error={errors.dueDays}
              hint="Use 0 for payment due immediately."
              required
            />
          </div>
          <Checkbox
            label="Active"
            description="Inactive terms cannot be attached to new subscriptions."
            checked={values.isActive}
            onChange={(checked) => setValue('isActive', checked)}
          />
        </section>
      </form>
    </Modal>
  );
}
