import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, Mail, Printer, XCircle } from 'lucide-react';
import { Alert } from '../../components/ui/Alert';
import { Badge, InvoiceStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input, Select, Textarea } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { describeApiError } from '../../lib/errors';
import { formatDate, formatDateTime, formatMoney, toDateTimeLocal, fromDateTimeLocal } from '../../lib/format';
import type { Invoice, InvoiceAction, PaymentMethod } from '../../types';

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' }
];

export function InvoiceDetailModal({
  invoice,
  onClose,
  onUpdated
}: {
  invoice: Invoice;
  onClose: () => void;
  onUpdated: (invoice: Invoice) => void;
}) {
  const toast = useToast();
  const [action, setAction] = useState<InvoiceAction | null>(null);
  const [confirmAction, setConfirmAction] = useState<InvoiceAction | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const canCancel = invoice.status === 'DRAFT' || invoice.status === 'CONFIRMED';
  const canPay = invoice.status === 'CONFIRMED' && Number(invoice.balanceDue) > 0;
  const canSendOrPrint = invoice.status === 'CONFIRMED' || invoice.status === 'PAID';

  async function performAction(nextAction: InvoiceAction) {
    setSubmitting(true);
    setError('');
    try {
      const updated = await api.invoices.action(invoice.id, nextAction);
      onUpdated(updated);
      setConfirmAction(null);
      toast.success(
        nextAction === 'SEND'
          ? 'Invoice marked as sent'
          : nextAction === 'PRINT'
            ? 'Print recorded'
            : nextAction === 'CONFIRM'
              ? 'Invoice confirmed'
              : 'Invoice cancelled',
        invoice.number
      );
      if (nextAction === 'PRINT') {
        window.print();
      }
    } catch (caught) {
      setError(describeApiError(caught));
      toast.error('Invoice action failed', describeApiError(caught));
    } finally {
      setSubmitting(false);
      setAction(null);
    }
  }

  async function handlePayment(input: {
    amount: number;
    method: PaymentMethod;
    paidAt: string;
    note?: string;
    reference?: string;
  }) {
    setSubmitting(true);
    setError('');
    try {
      const updated = await api.invoices.addPayment(invoice.id, {
        amount: input.amount,
        method: input.method,
        paidAt: input.paidAt,
        ...(input.note ? { note: input.note } : {}),
        ...(input.reference ? { reference: input.reference } : {})
      });
      onUpdated(updated);
      setPaymentOpen(false);
      toast.success('Payment recorded', `${formatMoney(input.amount)} applied to ${invoice.number}.`);
    } catch (caught) {
      const message = describeApiError(caught);
      setError(message);
      toast.error('Could not record payment', message);
      throw caught;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={invoice.number}
        description={`${invoice.customerName} · ${invoice.subscription.number}`}
        size="lg"
        dismissible={!submitting}
        footer={
          <div className="invoice-detail-footer">
            <div className="invoice-action-buttons">
              {invoice.status === 'DRAFT' && (
                <Button
                  icon={<CheckCircle2 size={15} />}
                  loading={submitting && action === 'CONFIRM'}
                  onClick={() => setConfirmAction('CONFIRM')}
                >
                  Confirm
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="danger"
                  icon={<XCircle size={15} />}
                  loading={submitting && action === 'CANCEL'}
                  onClick={() => setConfirmAction('CANCEL')}
                >
                  Cancel invoice
                </Button>
              )}
              {canSendOrPrint && (
                <>
                  <Button
                    variant="secondary"
                    icon={<Mail size={15} />}
                    loading={submitting && action === 'SEND'}
                    onClick={() => {
                      setAction('SEND');
                      void performAction('SEND');
                    }}
                  >
                    Mark as sent
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<Printer size={15} />}
                    loading={submitting && action === 'PRINT'}
                    onClick={() => {
                      setAction('PRINT');
                      void performAction('PRINT');
                    }}
                  >
                    Print
                  </Button>
                </>
              )}
              {canPay && (
                <Button
                  variant="primary"
                  loading={submitting && paymentOpen}
                  onClick={() => setPaymentOpen((current) => !current)}
                >
                  {paymentOpen ? 'Close payment form' : 'Record payment'}
                </Button>
              )}
            </div>
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Done
            </Button>
          </div>
        }
      >
        {error && <Alert tone="error">{error}</Alert>}
        <div className="invoice-printable">
          <div className="invoice-document-heading">
            <div>
              <span className="page-eyebrow">Invoice</span>
              <h2>{invoice.number}</h2>
              <p>{invoice.subscription.plan.name}</p>
            </div>
            <InvoiceStatusBadge status={invoice.status} />
          </div>

          <section className="invoice-facts" aria-label="Invoice information">
            <div>
              <span>Bill to</span>
              <strong>{invoice.customerName}</strong>
              <small>{invoice.customerEmail}</small>
            </div>
            <div>
              <span>Subscription</span>
              <strong>{invoice.subscription.number}</strong>
              <small>{invoice.subscription.plan.name}</small>
            </div>
            <div>
              <span>Issue date</span>
              <strong>{formatDate(invoice.issueDate)}</strong>
              <small>Due {formatDate(invoice.dueDate)}</small>
            </div>
            <div>
              <span>Billing period</span>
              <strong>{formatDate(invoice.periodStart)}</strong>
              <small>through {formatDate(invoice.periodEnd)}</small>
            </div>
          </section>

          <section className="invoice-lines-section">
            <h3>Invoice lines</h3>
            <div className="mini-table-wrap">
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Tax rate</th>
                    <th>Tax</th>
                    <th>Line amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line) => (
                    <tr key={line.id}>
                      <td>{line.description}</td>
                      <td>{line.quantity}</td>
                      <td>{formatMoney(line.unitPrice)}</td>
                      <td>{Number(line.taxRate)}%</td>
                      <td>{formatMoney(line.taxAmount)}</td>
                      <td>{formatMoney(line.lineAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="invoice-totals" aria-label="Invoice totals">
            <div><span>Subtotal</span><strong>{formatMoney(invoice.subtotal)}</strong></div>
            {Number(invoice.discountTotal) > 0 && (
              <div><span>Discount</span><strong>−{formatMoney(invoice.discountTotal)}</strong></div>
            )}
            <div><span>Tax</span><strong>{formatMoney(invoice.taxTotal)}</strong></div>
            <div><span>Total</span><strong>{formatMoney(invoice.total)}</strong></div>
            <div><span>Amount paid</span><strong>{formatMoney(invoice.amountPaid)}</strong></div>
            <div className="invoice-balance">
              <span>Balance due</span><strong>{formatMoney(invoice.balanceDue)}</strong>
            </div>
          </section>

          {invoice.discounts.length > 0 && (
            <section className="portal-discounts">
              <h3>Applied discount</h3>
              {invoice.discounts.map((discount) => (
                <div key={discount.id}>
                  <span>
                    {discount.name} · {discount.scope === 'PRODUCT' ? 'Product' : 'Subscription'} ·{' '}
                    {discount.type === 'PERCENTAGE'
                      ? `${Number(discount.value)}%`
                      : formatMoney(discount.value)}
                  </span>
                  <strong>−{formatMoney(discount.amount)}</strong>
                </div>
              ))}
            </section>
          )}

          <section className="invoice-history">
            <div className="panel-header">
              <div>
                <h3>Payment history</h3>
                <p>Recorded payments applied to this invoice.</p>
              </div>
              <Badge tone="neutral">{invoice.payments.length} payments</Badge>
            </div>
            {invoice.payments.length === 0 ? (
              <p className="detail-empty">No payments have been recorded.</p>
            ) : (
              <div className="mini-table-wrap">
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th>Note</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDateTime(payment.paidAt)}</td>
                        <td>{paymentMethods.find((entry) => entry.value === payment.method)?.label ?? payment.method}</td>
                        <td>{payment.reference || '—'}</td>
                        <td>{payment.note || '—'}</td>
                        <td>{formatMoney(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="invoice-tracking">
            <span>Confirmed {formatDateTime(invoice.confirmedAt)}</span>
            <span>Sent {formatDateTime(invoice.sentAt)}</span>
            <span>Printed {formatDateTime(invoice.printedAt)}</span>
            <span>Paid {formatDateTime(invoice.paidAt)}</span>
            {invoice.cancelledAt && (
              <span>Cancelled {formatDateTime(invoice.cancelledAt)}</span>
            )}
          </section>
        </div>

        {paymentOpen && canPay && (
          <PaymentForm
            invoice={invoice}
            submitting={submitting}
            onSubmit={handlePayment}
            onCancel={() => setPaymentOpen(false)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction === 'CANCEL' ? 'Cancel this invoice?' : 'Confirm this invoice?'}
        message={
          confirmAction === 'CANCEL'
            ? `${invoice.number} will be cancelled and no further payments can be recorded.`
            : `${invoice.number} will be confirmed and ready for payment.`
        }
        confirmLabel={confirmAction === 'CANCEL' ? 'Cancel invoice' : 'Confirm invoice'}
        loading={submitting}
        onConfirm={() => {
          if (confirmAction) {
            setAction(confirmAction);
            void performAction(confirmAction);
          }
        }}
        onClose={() => {
          if (!submitting) setConfirmAction(null);
        }}
      />
    </>
  );
}

function PaymentForm({
  invoice,
  submitting,
  onSubmit,
  onCancel
}: {
  invoice: Invoice;
  submitting: boolean;
  onSubmit: (input: {
    amount: number;
    method: PaymentMethod;
    paidAt: string;
    note?: string;
    reference?: string;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(String(Number(invoice.balanceDue).toFixed(2)));
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [paidAt, setPaidAt] = useState(toDateTimeLocal(new Date().toISOString()));
  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    const date = fromDateTimeLocal(paidAt);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a payment amount greater than zero.');
      return;
    }
    if (Math.abs(parsedAmount * 100 - Math.round(parsedAmount * 100)) > 0.000001) {
      setError('Enter a payment amount in cents (up to two decimal places).');
      return;
    }
    if (parsedAmount > Number(invoice.balanceDue)) {
      setError(`Payment cannot exceed the remaining balance of ${formatMoney(invoice.balanceDue)}.`);
      return;
    }
    if (!date) {
      setError('Enter a valid payment date and time.');
      return;
    }
    setError('');
    try {
      await onSubmit({
        amount: parsedAmount,
        method,
        paidAt: date,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(reference.trim() ? { reference: reference.trim() } : {})
      });
    } catch {
      // The parent surfaces request failures and keeps this form available for correction.
    }
  }

  return (
    <form className="invoice-payment-form" onSubmit={handleSubmit} noValidate>
      <div className="panel-header">
        <div>
          <h3>Record a payment</h3>
          <p>Remaining balance: {formatMoney(invoice.balanceDue)}</p>
        </div>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="form-grid">
        <Input
          label="Amount"
          type="number"
          min="0.01"
          step="0.01"
          max={Number(invoice.balanceDue)}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
        <Select
          label="Payment method"
          value={method}
          onChange={(event) => setMethod(event.target.value as PaymentMethod)}
        >
          {paymentMethods.map((entry) => (
            <option key={entry.value} value={entry.value}>{entry.label}</option>
          ))}
        </Select>
        <Input
          label="Paid at"
          type="datetime-local"
          value={paidAt}
          onChange={(event) => setPaidAt(event.target.value)}
          required
        />
        <Input
          label="Reference (optional)"
          value={reference}
          maxLength={200}
          onChange={(event) => setReference(event.target.value)}
        />
      </div>
      <Textarea
        label="Note (optional)"
        value={note}
        maxLength={1000}
        rows={2}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="invoice-payment-actions">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Save payment
        </Button>
      </div>
    </form>
  );
}
