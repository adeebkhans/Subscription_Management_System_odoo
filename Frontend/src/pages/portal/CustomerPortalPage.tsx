import { useCallback, useState } from 'react';
import { CalendarClock, CreditCard, FileText } from 'lucide-react';
import { Alert } from '../../components/ui/Alert';
import { Badge, InvoiceStatusBadge, SubscriptionStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Select } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/ui/StatCard';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../lib/api';
import { describeApiError } from '../../lib/errors';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  frequencySuffix,
  paymentTermDueLabel
} from '../../lib/format';
import type {
  Invoice,
  InvoiceStatus,
  PaginatedResult,
  Subscription,
  SubscriptionStatus
} from '../../types';

type PortalTab = 'subscriptions' | 'invoices';
type SubscriptionFilter = 'ALL' | SubscriptionStatus;
type InvoiceFilter = 'ALL' | InvoiceStatus;

export function CustomerPortalPage() {
  const [tab, setTab] = useState<PortalTab>('subscriptions');
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionFilter>('ALL');
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceFilter>('ALL');
  const [subscriptionPage, setSubscriptionPage] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const loadSubscriptions = useCallback(
    () =>
      api.portal.subscriptions({
        page: subscriptionPage,
        pageSize: 20,
        status: subscriptionStatus === 'ALL' ? undefined : subscriptionStatus
      }),
    [subscriptionPage, subscriptionStatus]
  );
  const loadInvoices = useCallback(
    () =>
      api.portal.invoices({
        page: invoicePage,
        pageSize: 20,
        status: invoiceStatus === 'ALL' ? undefined : invoiceStatus
      }),
    [invoicePage, invoiceStatus]
  );
  const subscriptionsState = useAsync(loadSubscriptions, [loadSubscriptions]);
  const invoicesState = useAsync(loadInvoices, [loadInvoices]);

  const subscriptions = subscriptionsState.data?.items ?? [];
  const invoices = invoicesState.data?.items ?? [];
  const outstanding = invoices.reduce(
    (sum, invoice) =>
      sum + (invoice.status === 'CONFIRMED' ? Number(invoice.balanceDue) : 0),
    0
  );
  const activeCount = subscriptions.filter((subscription) =>
    ['ACTIVE', 'CONFIRMED', 'PAUSED'].includes(subscription.status)
  ).length;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Customer portal"
        title="Your account"
        description="Review your subscription agreements, invoices, payment history, and balances."
      />

      <section className="stats-grid stats-grid-compact" aria-label="Account overview">
        <StatCard
          label="Subscriptions"
          value={subscriptionsState.data?.pagination?.total ?? subscriptions.length}
          hint="Your agreements"
          icon={<CalendarClock size={20} />}
          tone="primary"
        />
        <StatCard
          label="On this page"
          value={activeCount}
          hint="Active, confirmed, or paused"
          icon={<CalendarClock size={20} />}
          tone="success"
        />
        <StatCard
          label="Invoices"
          value={invoicesState.data?.pagination?.total ?? invoices.length}
          hint="Your billing history"
          icon={<FileText size={20} />}
          tone="info"
        />
        <StatCard
          label="Balance due"
          value={formatMoney(outstanding)}
          hint="Confirmed invoices on this page"
          icon={<CreditCard size={20} />}
          tone="warning"
        />
      </section>

      <div className="portal-tabs" role="tablist" aria-label="Account sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'subscriptions'}
          className={tab === 'subscriptions' ? 'portal-tab is-active' : 'portal-tab'}
          onClick={() => setTab('subscriptions')}
        >
          <CalendarClock size={16} /> My subscriptions
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'invoices'}
          className={tab === 'invoices' ? 'portal-tab is-active' : 'portal-tab'}
          onClick={() => setTab('invoices')}
        >
          <FileText size={16} /> My invoices
        </button>
      </div>

      {tab === 'subscriptions' ? (
        <SubscriptionList
          items={subscriptions}
          result={subscriptionsState.data}
          loading={subscriptionsState.loading}
          error={subscriptionsState.error}
          status={subscriptionStatus}
          page={subscriptionPage}
          onStatusChange={(value) => {
            setSubscriptionStatus(value);
            setSubscriptionPage(1);
          }}
          onPageChange={setSubscriptionPage}
          onRetry={subscriptionsState.reload}
          onSelect={setSelectedSubscription}
        />
      ) : (
        <InvoiceList
          items={invoices}
          result={invoicesState.data}
          loading={invoicesState.loading}
          error={invoicesState.error}
          status={invoiceStatus}
          page={invoicePage}
          onStatusChange={(value) => {
            setInvoiceStatus(value);
            setInvoicePage(1);
          }}
          onPageChange={setInvoicePage}
          onRetry={invoicesState.reload}
          onSelect={setSelectedInvoice}
        />
      )}

      {selectedSubscription && (
        <PortalSubscriptionModal
          subscription={selectedSubscription}
          onClose={() => setSelectedSubscription(null)}
        />
      )}
      {selectedInvoice && (
        <PortalInvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
}

function SubscriptionList({
  items,
  result,
  loading,
  error,
  status,
  page,
  onStatusChange,
  onPageChange,
  onRetry,
  onSelect
}: {
  items: Subscription[];
  result: PaginatedResult<Subscription> | null;
  loading: boolean;
  error: unknown;
  status: SubscriptionFilter;
  page: number;
  onStatusChange: (status: SubscriptionFilter) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onSelect: (subscription: Subscription) => void;
}) {
  return (
    <>
      <section className="toolbar-card portal-toolbar">
        <p>These agreements are visible only to your signed-in customer account.</p>
        <Select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as SubscriptionFilter)}
          aria-label="Filter your subscriptions by status"
        >
          <option value="ALL">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="QUOTATION">Quotation</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="CLOSED">Closed</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </section>
      {error && <LoadError title="Could not load your subscriptions" error={error} onRetry={onRetry} />}
      {loading && !result ? (
        <LoadingState label="Loading your subscriptions" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={24} />}
          title="No subscriptions found"
          description="Your subscription agreements will appear here once they are created."
        />
      ) : (
        <div className="table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subscription</th><th>Plan</th><th>Status</th><th>Start</th><th>Expiry</th><th>Total</th>
                  <th className="table-actions-head"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((subscription) => (
                  <tr key={subscription.id}>
                    <td><strong>{subscription.number}</strong></td>
                    <td>{subscription.plan.name}</td>
                    <td><SubscriptionStatusBadge status={subscription.status} /></td>
                    <td>{formatDate(subscription.startDate)}</td>
                    <td>{formatDate(subscription.expiryDate)}</td>
                    <td className="table-money">{formatMoney(subscription.total)}</td>
                    <td className="table-actions">
                      <Button variant="ghost" size="sm" onClick={() => onSelect(subscription)}>
                        View details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <PortalPagination result={result} page={page} loading={loading} onPageChange={onPageChange} label="Subscription pages" />
    </>
  );
}

function InvoiceList({
  items,
  result,
  loading,
  error,
  status,
  page,
  onStatusChange,
  onPageChange,
  onRetry,
  onSelect
}: {
  items: Invoice[];
  result: PaginatedResult<Invoice> | null;
  loading: boolean;
  error: unknown;
  status: InvoiceFilter;
  page: number;
  onStatusChange: (status: InvoiceFilter) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onSelect: (invoice: Invoice) => void;
}) {
  return (
    <>
      <section className="toolbar-card portal-toolbar">
        <p>View your invoice history, applied discounts, recorded payments, and amounts due.</p>
        <Select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as InvoiceFilter)}
          aria-label="Filter your invoices by status"
        >
          <option value="ALL">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </section>
      {error && <LoadError title="Could not load your invoices" error={error} onRetry={onRetry} />}
      {loading && !result ? (
        <LoadingState label="Loading your invoices" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          title="No invoices found"
          description="Invoices and payment records for your account will appear here."
        />
      ) : (
        <div className="table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th><th>Subscription</th><th>Status</th><th>Issued</th><th>Due</th><th>Total</th><th>Paid</th><th>Balance due</th>
                  <th className="table-actions-head"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><strong>{invoice.number}</strong></td>
                    <td>{invoice.subscription.number}</td>
                    <td><InvoiceStatusBadge status={invoice.status} /></td>
                    <td>{formatDate(invoice.issueDate)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td className="table-money">{formatMoney(invoice.total)}</td>
                    <td className="table-money">{formatMoney(invoice.amountPaid)}</td>
                    <td className="table-money">{formatMoney(invoice.balanceDue)}</td>
                    <td className="table-actions">
                      <Button variant="ghost" size="sm" onClick={() => onSelect(invoice)}>
                        View details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <PortalPagination result={result} page={page} loading={loading} onPageChange={onPageChange} label="Invoice pages" />
    </>
  );
}

function PortalPagination<T>({
  result,
  page,
  loading,
  onPageChange,
  label
}: {
  result: PaginatedResult<T> | null;
  page: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  label: string;
}) {
  const pagination = result?.pagination;
  if (!pagination || pagination.totalPages < 2) return null;
  return (
    <nav className="pagination-controls" aria-label={label}>
      <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)}>Previous</Button>
      <span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} records</span>
      <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages || loading} onClick={() => onPageChange(page + 1)}>Next</Button>
    </nav>
  );
}

function PortalSubscriptionModal({
  subscription,
  onClose
}: {
  subscription: Subscription;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} title={subscription.number} description="Your subscription details" size="lg">
      <div className="portal-detail">
        <div className="portal-detail-heading">
          <SubscriptionStatusBadge status={subscription.status} />
          <span>{subscription.plan.name} · {formatMoney(subscription.plan.price)}{frequencySuffix(subscription.plan.frequency)}</span>
        </div>
        <div className="invoice-facts">
          <div><span>Start date</span><strong>{formatDate(subscription.startDate)}</strong></div>
          <div><span>Expiry date</span><strong>{formatDate(subscription.expiryDate)}</strong></div>
          <div><span>Payment terms</span><strong>{subscription.paymentTerm?.name ?? 'Not specified'}</strong><small>{subscription.paymentTerm ? paymentTermDueLabel(subscription.paymentTerm.dueDays) : ''}</small></div>
          <div><span>Quotation valid until</span><strong>{formatDate(subscription.quotationValidUntil)}</strong></div>
        </div>
        <div className="mini-table-wrap">
          <table className="mini-table">
            <thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Tax</th><th>Amount</th></tr></thead>
            <tbody>
              {subscription.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.description || line.product?.name || 'Product'}</td>
                  <td>{line.quantity}</td>
                  <td>{formatMoney(line.unitPrice)}</td>
                  <td>{Number(line.taxRate)}%</td>
                  <td>{formatMoney(Number(line.lineAmount) + Number(line.taxAmount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="invoice-totals">
          <div><span>Subtotal</span><strong>{formatMoney(subscription.subtotal)}</strong></div>
          <div><span>Tax</span><strong>{formatMoney(subscription.taxTotal)}</strong></div>
          <div className="invoice-balance"><span>Total</span><strong>{formatMoney(subscription.total)}</strong></div>
        </div>
        <p className="portal-readonly-note">For changes to your agreement, please contact your account representative.</p>
      </div>
    </Modal>
  );
}

function PortalInvoiceModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={invoice.number} description="Your invoice and payment details" size="lg">
      <div className="portal-detail">
        <div className="portal-detail-heading">
          <InvoiceStatusBadge status={invoice.status} />
          <span>{invoice.subscription.number} · Due {formatDate(invoice.dueDate)}</span>
        </div>
        <div className="invoice-facts">
          <div><span>Issued</span><strong>{formatDate(invoice.issueDate)}</strong></div>
          <div><span>Billing period</span><strong>{formatDate(invoice.periodStart)}</strong><small>through {formatDate(invoice.periodEnd)}</small></div>
          <div><span>Subscription</span><strong>{invoice.subscription.plan.name}</strong></div>
          <div><span>Payment status</span><strong>{invoice.status === 'PAID' ? 'Settled' : formatMoney(invoice.balanceDue) + ' due'}</strong></div>
        </div>
        <div className="mini-table-wrap">
          <table className="mini-table">
            <thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Tax</th><th>Line amount</th></tr></thead>
            <tbody>
              {invoice.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.description}</td><td>{line.quantity}</td><td>{formatMoney(line.unitPrice)}</td><td>{Number(line.taxRate)}%</td><td>{formatMoney(line.lineAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {invoice.discounts.length > 0 && (
          <section className="portal-discounts">
            <h3>Applied discounts</h3>
            {invoice.discounts.map((discount) => (
              <div key={discount.id}>
                <span>{discount.name} · {discount.scope === 'PRODUCT' ? 'Product' : 'Subscription'} · {discount.type === 'PERCENTAGE' ? `${Number(discount.value)}%` : formatMoney(discount.value)}</span>
                <strong>−{formatMoney(discount.amount)}</strong>
              </div>
            ))}
          </section>
        )}
        <div className="invoice-totals">
          <div><span>Subtotal</span><strong>{formatMoney(invoice.subtotal)}</strong></div>
          {Number(invoice.discountTotal) > 0 && <div><span>Discount</span><strong>−{formatMoney(invoice.discountTotal)}</strong></div>}
          <div><span>Tax</span><strong>{formatMoney(invoice.taxTotal)}</strong></div>
          <div><span>Total</span><strong>{formatMoney(invoice.total)}</strong></div>
          <div><span>Amount paid</span><strong>{formatMoney(invoice.amountPaid)}</strong></div>
          <div className="invoice-balance"><span>Balance due</span><strong>{formatMoney(invoice.balanceDue)}</strong></div>
        </div>
        <section className="invoice-history">
          <div className="panel-header"><div><h3>Payment history</h3><p>Payments recorded against this invoice.</p></div><Badge tone="neutral">{invoice.payments.length} payments</Badge></div>
          {invoice.payments.length === 0 ? (
            <p className="detail-empty">No payments have been recorded.</p>
          ) : invoice.payments.map((payment) => (
            <div className="portal-payment-row" key={payment.id}>
              <div><strong>{formatDateTime(payment.paidAt)}</strong><span>{payment.method.replace('_', ' ')}{payment.reference ? ` · ${payment.reference}` : ''}</span></div>
              <strong>{formatMoney(payment.amount)}</strong>
            </div>
          ))}
        </section>
        <p className="portal-readonly-note">This portal is read-only. Contact your account representative to discuss payment or invoice questions.</p>
      </div>
    </Modal>
  );
}

function LoadError({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  return (
    <Alert tone="error" title={title} action={<Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>}>
      {describeApiError(error)}
    </Alert>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="table-card">
      <div className="table-loading"><Spinner label={label} /><span>{label}…</span></div>
    </div>
  );
}
