import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileText,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { Alert } from '../../components/ui/Alert';
import { Badge, SubscriptionStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input, Textarea } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../hooks/useAsync';
import { useFormState } from '../../hooks/useFormState';
import { api } from '../../lib/api';
import { describeApiError, zodFieldErrors } from '../../lib/errors';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  frequencySuffix,
  paymentTermDueLabel,
  subscriptionActionLabel
} from '../../lib/format';
import {
  cancelSubscriptionFormSchema,
  subscriptionRenewFormSchema
} from '../../lib/validation';
import type { Subscription, SubscriptionAction } from '../../types';
import { SubscriptionEditModal } from './SubscriptionEditModal';

const ACTION_MESSAGES: Record<SubscriptionAction, string> = {
  SUBMIT: 'Submit this draft as a quotation? The quotation validity window starts now.',
  CONFIRM: 'Confirm this quotation and move it forward for activation?',
  ACTIVATE: 'Activate this subscription and begin the billing period?',
  PAUSE: 'Pause this subscription? Billing and access should be suspended until it resumes.',
  RESUME: 'Resume this paused subscription and continue its lifecycle?',
  CLOSE: 'Close this subscription now? This action ends the agreement.',
  CANCEL: 'Cancel this subscription? This cannot be undone.'
};

function actionIcon(action: SubscriptionAction) {
  if (action === 'SUBMIT') return <FileText size={15} />;
  if (action === 'CONFIRM') return <CheckCircle2 size={15} />;
  if (action === 'ACTIVATE') return <Play size={15} />;
  if (action === 'PAUSE') return <Pause size={15} />;
  if (action === 'RESUME') return <Play size={15} />;
  if (action === 'CLOSE') return <XCircle size={15} />;
  return <Ban size={15} />;
}

function actionVariant(action: SubscriptionAction) {
  if (action === 'CANCEL') return 'danger' as const;
  if (action === 'CLOSE') return 'outline' as const;
  if (action === 'PAUSE') return 'secondary' as const;
  return 'primary' as const;
}

export function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(() => {
    if (!id) return Promise.reject(new Error('Missing subscription id'));
    return api.subscriptions.get(id);
  }, [id]);
  const { data: subscription, loading, error, reload } = useAsync(load, [load]);

  const [editOpen, setEditOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<SubscriptionAction | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  async function handleTransition(action: SubscriptionAction, reason?: string): Promise<boolean> {
    if (!subscription) return false;
    setActionSubmitting(true);
    try {
      await api.subscriptions.transition(subscription.id, action, reason);
      toast.success(
        subscriptionActionLabel(action),
        `${subscription.number} moved to its next lifecycle stage.`
      );
      setTransitionTarget(null);
      reload();
      return true;
    } catch (caught) {
      toast.error(`Could not ${action.toLowerCase()} subscription`, describeApiError(caught));
      return false;
    } finally {
      setActionSubmitting(false);
    }
  }

  function handleRenewed(renewed: Subscription) {
    toast.success(
      'Subscription renewed',
      `${renewed.number} was created from ${subscription?.number ?? 'the original'}.`
    );
    setRenewOpen(false);
    navigate(`/app/subscriptions/${renewed.id}`);
  }

  if (loading && !subscription) {
    return (
      <div className="page-stack">
        <div className="table-card">
          <div className="table-loading">
            <Spinner label="Loading subscription" />
            <span>Loading subscription…</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="page-stack">
        <Alert
          tone="error"
          title="Could not load subscription"
          action={
            <Button variant="secondary" size="sm" onClick={reload}>
              Retry
            </Button>
          }
        >
          {describeApiError(error)}
        </Alert>
        <Link to="/app/subscriptions" className="button button-secondary button-sm">
          <ArrowLeft size={15} />
          <span>Back to subscriptions</span>
        </Link>
      </div>
    );
  }

  const actions = subscription.availableActions ?? [];
  const canEdit = subscription.status === 'DRAFT' || subscription.status === 'QUOTATION';
  const canRenew =
    subscription.plan.allowRenew &&
    (subscription.status === 'ACTIVE' || subscription.status === 'CLOSED');

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Subscription detail"
        title={subscription.number}
        description={`${subscription.customer.name} · ${subscription.plan.name}`}
        actions={
          <div className="detail-actions">
            <Link to="/app/subscriptions" className="button button-secondary button-sm">
              <ArrowLeft size={15} />
              <span>Back</span>
            </Link>
            {canEdit && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Pencil size={15} />}
                onClick={() => setEditOpen(true)}
              >
                Edit
              </Button>
            )}
            {canRenew && (
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw size={15} />}
                onClick={() => setRenewOpen(true)}
              >
                Renew
              </Button>
            )}
            {actions.map((action) => (
              <Button
                key={action}
                variant={actionVariant(action)}
                size="sm"
                icon={actionIcon(action)}
                onClick={() =>
                  action === 'CANCEL' ? setCancelOpen(true) : setTransitionTarget(action)
                }
              >
                {subscriptionActionLabel(action)}
              </Button>
            ))}
          </div>
        }
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Agreement summary</h2>
            <p>The commercial and lifecycle facts for this subscription.</p>
          </div>
          <SubscriptionStatusBadge status={subscription.status} />
        </div>

        <div className="detail-grid">
          <div>
            <span>Customer</span>
            <strong>{subscription.customer.name}</strong>
            <small>{subscription.customer.email}</small>
          </div>
          <div>
            <span>Plan</span>
            <strong>{subscription.plan.name}</strong>
            <small>
              {formatMoney(subscription.plan.price)}
              {frequencySuffix(subscription.plan.frequency)}
            </small>
          </div>
          <div>
            <span>Start date</span>
            <strong>{formatDate(subscription.startDate)}</strong>
          </div>
          <div>
            <span>Expiry date</span>
            <strong>
              {subscription.expiryDate ? formatDate(subscription.expiryDate) : 'Open-ended'}
            </strong>
          </div>
          <div>
            <span>Payment term</span>
            <strong>{subscription.paymentTerm?.name ?? 'None'}</strong>
            {subscription.paymentTerm && (
              <small>{paymentTermDueLabel(subscription.paymentTerm.dueDays)}</small>
            )}
          </div>
          <div>
            <span>Quotation template</span>
            <strong>{subscription.quotationTemplate?.name ?? 'None'}</strong>
            {subscription.quotationValidUntil && (
              <small>Valid until {formatDate(subscription.quotationValidUntil)}</small>
            )}
          </div>
          <div>
            <span>Created</span>
            <strong>{formatDate(subscription.createdAt)}</strong>
            <small>{formatDateTime(subscription.createdAt)}</small>
          </div>
          <div>
            <span>Last updated</span>
            <strong>{formatDate(subscription.updatedAt)}</strong>
            <small>{formatDateTime(subscription.updatedAt)}</small>
          </div>
        </div>
      </section>

      {(subscription.pausedAt || subscription.closedAt || subscription.cancelledReason) && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Lifecycle notes</h2>
              <p>Timestamps and context from the latest lifecycle event.</p>
            </div>
          </div>
          <div className="detail-grid">
            {subscription.pausedAt && (
              <div>
                <span>Paused at</span>
                <strong>{formatDateTime(subscription.pausedAt)}</strong>
              </div>
            )}
            {subscription.closedAt && (
              <div>
                <span>Closed at</span>
                <strong>{formatDateTime(subscription.closedAt)}</strong>
              </div>
            )}
            {subscription.cancelledReason && (
              <div className="detail-span-2">
                <span>Cancellation reason</span>
                <strong>{subscription.cancelledReason}</strong>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Product lines</h2>
            <p>Products, quantities, taxes, and line totals.</p>
          </div>
          <Badge tone="neutral">{subscription.lines.length} lines</Badge>
        </div>

        <div className="mini-table-wrap">
          <table className="mini-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Tax</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              {subscription.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.product?.name ?? 'Product'}</td>
                  <td>
                    {line.variant
                      ? `${line.variant.attribute}: ${line.variant.value}`
                      : 'Base price'}
                  </td>
                  <td>{line.description || '—'}</td>
                  <td>{line.quantity}</td>
                  <td>{formatMoney(line.unitPrice)}</td>
                  <td>{Number(line.taxRate)}%</td>
                  <td>{formatMoney(line.lineAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="detail-totals">
          <div>
            <span>Subtotal</span>
            <strong>{formatMoney(subscription.subtotal)}</strong>
          </div>
          <div>
            <span>Tax</span>
            <strong>{formatMoney(subscription.taxTotal)}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{formatMoney(subscription.total)}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Internal notes</h2>
            <p>Context visible to admins and staff.</p>
          </div>
          <FileText size={18} className="panel-icon" />
        </div>
        <p className={subscription.notes ? 'detail-copy' : 'detail-empty'}>
          {subscription.notes || 'No internal notes have been added.'}
        </p>
      </section>

      <div className="detail-meta-strip">
        <span>
          <CalendarClock size={15} />
          Started {formatDate(subscription.startDate)}
        </span>
        <span>
          <CreditCard size={15} />
          {subscription.paymentTerm?.name ?? 'No payment term'}
        </span>
        <span>
          <RefreshCw size={15} />
          {subscription.plan.allowRenew ? 'Renewals enabled' : 'Renewals disabled'}
        </span>
      </div>

      <SubscriptionEditModal
        open={editOpen}
        subscription={subscription}
        onClose={() => setEditOpen(false)}
        onSaved={(message) => {
          toast.success(message);
          reload();
        }}
      />

      <ConfirmDialog
        open={transitionTarget !== null}
        title={`${subscriptionActionLabel(transitionTarget ?? 'CANCEL')}?`}
        message={transitionTarget ? ACTION_MESSAGES[transitionTarget] : ''}
        confirmLabel={subscriptionActionLabel(transitionTarget ?? 'CANCEL')}
        loading={actionSubmitting}
        onConfirm={() => {
          if (transitionTarget) void handleTransition(transitionTarget);
        }}
        onClose={() => {
          if (!actionSubmitting) setTransitionTarget(null);
        }}
      />

      <CancelSubscriptionModal
        open={cancelOpen}
        subscription={subscription}
        loading={actionSubmitting}
        onClose={() => {
          if (!actionSubmitting) setCancelOpen(false);
        }}
        onConfirm={async (reason) => {
          const success = await handleTransition('CANCEL', reason);
          if (success) setCancelOpen(false);
          return success;
        }}
      />

      <SubscriptionRenewModal
        open={renewOpen}
        subscription={subscription}
        onClose={() => setRenewOpen(false)}
        onRenewed={handleRenewed}
      />
    </div>
  );
}

function CancelSubscriptionModal({
  open,
  subscription,
  loading,
  onClose,
  onConfirm
}: {
  open: boolean;
  subscription: Subscription;
  loading: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<boolean>;
}) {
  const {
    values,
    errors,
    setErrors,
    formError,
    setFormError,
    setValue,
    reset
  } = useFormState({ reason: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) reset({ reason: '' });
  }, [open, reset]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = cancelSubscriptionFormSchema.safeParse(values);
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      setFormError('Review the reason and try again.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    const reason = result.data.reason?.trim();
    const success = await onConfirm(reason || undefined);
    if (!success) {
      setFormError('The cancellation could not be completed. Please try again.');
    }
    setSubmitting(false);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancel subscription?"
      description={`${subscription.number} will be cancelled and cannot be reactivated.`}
      size="sm"
      dismissible={!loading && !submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading || submitting}>
            Keep subscription
          </Button>
          <Button
            type="submit"
            form="cancel-subscription-form"
            variant="danger"
            loading={loading || submitting}
          >
            Cancel subscription
          </Button>
        </>
      }
    >
      <form
        id="cancel-subscription-form"
        className="form-stack"
        onSubmit={handleSubmit}
        noValidate
      >
        {formError && <Alert tone="error">{formError}</Alert>}
        <Textarea
          label="Reason"
          name="reason"
          rows={3}
          placeholder="Optional context for the cancellation…"
          value={values.reason}
          onChange={(event) => setValue('reason', event.target.value)}
          error={errors.reason}
          hint="Up to 500 characters. This is stored on the subscription."
        />
      </form>
    </Modal>
  );
}

function SubscriptionRenewModal({
  open,
  subscription,
  onClose,
  onRenewed
}: {
  open: boolean;
  subscription: Subscription;
  onClose: () => void;
  onRenewed: (subscription: Subscription) => void;
}) {
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
  } = useFormState({ startDate: '', expiryDate: '' });

  useEffect(() => {
    if (open) reset({ startDate: '', expiryDate: '' });
  }, [open, reset]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = subscriptionRenewFormSchema.safeParse(values);
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      setFormError('Review the renewal dates and try again.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const renewed = await api.subscriptions.renew(subscription.id, {
        ...(result.data.startDate ? { startDate: result.data.startDate } : {}),
        ...(result.data.expiryDate ? { expiryDate: result.data.expiryDate } : {})
      });
      onRenewed(renewed);
    } catch (caught) {
      setFormError(describeApiError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Renew subscription"
      description={`Create a new subscription from ${subscription.number}.`}
      size="sm"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="renew-subscription-form"
            loading={submitting}
          >
            Renew subscription
          </Button>
        </>
      }
    >
      <form
        id="renew-subscription-form"
        className="form-stack"
        onSubmit={handleSubmit}
        noValidate
      >
        {formError && <Alert tone="error">{formError}</Alert>}
        <Alert tone="info">
          Leave the dates blank to start the renewal the day after the current expiry date.
        </Alert>
        <Input
          label="New start date"
          name="startDate"
          type="date"
          value={values.startDate}
          onChange={(event) => setValue('startDate', event.target.value)}
          error={errors.startDate}
        />
        <Input
          label="New expiry date"
          name="expiryDate"
          type="date"
          value={values.expiryDate}
          onChange={(event) => setValue('expiryDate', event.target.value)}
          error={errors.expiryDate}
        />
      </form>
    </Modal>
  );
}
