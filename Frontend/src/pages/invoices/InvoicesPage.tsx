import { useCallback, useState } from 'react';
import { FileText, Play, Plus, ReceiptText, Search } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Alert } from '../../components/ui/Alert';
import { InvoiceStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input, Select } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/ui/StatCard';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../lib/api';
import { describeApiError } from '../../lib/errors';
import { formatDate, formatMoney } from '../../lib/format';
import type { GenerateInvoiceInput, Invoice, InvoiceListParams, InvoiceStatus, Subscription } from '../../types';
import { InvoiceDetailModal } from './InvoiceDetailModal';

type StatusFilter = 'ALL' | InvoiceStatus;

function isOverdue(invoice: Invoice) {
  return (
    invoice.status === 'CONFIRMED' &&
    Number(invoice.balanceDue) > 0 &&
    new Date(invoice.dueDate).getTime() < Date.now()
  );
}

function optionalDate(value: string, endOfDay = false) {
  if (!value) return undefined;
  return `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`;
}

export function InvoicesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canRunBilling = user?.role === 'ADMIN';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [billingRun, setBillingRun] = useState(false);

  const params: InvoiceListParams = {
    page,
    pageSize: 20,
    search: search.trim() || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    dueDateFrom: optionalDate(dueFrom),
    dueDateTo: optionalDate(dueTo, true)
  };
  const load = useCallback(() => api.invoices.list(params), [search, statusFilter, dueFrom, dueTo, page]);
  const { data, loading, error, reload } = useAsync(load, [load]);
  const invoices = data?.items ?? [];

  async function openGenerate() {
    setGenerateOpen(true);
    setLoadingSubscriptions(true);
    setSubscriptionError('');
    try {
      setSubscriptions(await api.subscriptions.list({ status: 'ACTIVE' }));
    } catch (caught) {
      setSubscriptionError(describeApiError(caught));
    } finally {
      setLoadingSubscriptions(false);
    }
  }

  async function handleGenerate(input: GenerateInvoiceInput) {
    try {
      const result = await api.invoices.generate(input);
      setGenerateOpen(false);
      setSelected(result.invoice);
      toast.success(
        result.created ? 'Invoice generated' : 'Invoice already exists',
        result.created
          ? `${result.invoice.number} was created as a draft.`
          : `${result.invoice.number} already covers this billing period.`
      );
      reload();
    } catch (caught) {
      toast.error('Could not generate invoice', describeApiError(caught));
      throw caught;
    }
  }

  async function handleBillingRun() {
    setBillingRun(true);
    try {
      const result = await api.invoices.billingRun();
      toast.success(
        'Billing run complete',
        `${result.createdCount} created · ${result.existingCount} already existed · ${result.processedSubscriptions} subscriptions processed.`
      );
      reload();
    } catch (caught) {
      toast.error('Billing run failed', describeApiError(caught));
    } finally {
      setBillingRun(false);
    }
  }

  const outstanding = invoices.reduce(
    (sum, invoice) =>
      sum + (invoice.status === 'CONFIRMED' ? Number(invoice.balanceDue) : 0),
    0
  );
  const overdueCount = invoices.filter(isOverdue).length;
  const paidCount = invoices.filter((invoice) => invoice.status === 'PAID').length;
  const hasFilters =
    search.trim().length > 0 ||
    statusFilter !== 'ALL' ||
    dueFrom.length > 0 ||
    dueTo.length > 0;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Revenue operations"
        title="Invoices"
        description="Generate billing periods, track invoice status, and reconcile customer payments."
        actions={
          <div className="detail-actions">
            {canRunBilling && (
              <Button
                variant="secondary"
                icon={<Play size={16} />}
                loading={billingRun}
                onClick={handleBillingRun}
              >
                Run billing
              </Button>
            )}
            <Button icon={<Plus size={16} />} onClick={openGenerate}>
              Generate invoice
            </Button>
          </div>
        }
      />

      <section className="stats-grid stats-grid-compact" aria-label="Invoice summary">
        <StatCard
          label="Invoices"
          value={invoices.length}
          hint="Loaded results"
          icon={<ReceiptText size={20} />}
          tone="primary"
        />
        <StatCard
          label="Outstanding"
          value={formatMoney(outstanding)}
          hint="Balance due in results"
          icon={<ReceiptText size={20} />}
          tone="warning"
        />
        <StatCard
          label="Overdue"
          value={overdueCount}
          hint="Confirmed past due"
          icon={<ReceiptText size={20} />}
          tone={overdueCount > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Paid"
          value={paidCount}
          hint="Settled in results"
          icon={<ReceiptText size={20} />}
          tone="success"
        />
      </section>

      <section className="toolbar-card invoice-toolbar">
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search invoice or customer…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            aria-label="Search invoices"
          />
        </div>
        <div className="toolbar-filters invoice-filters">
          <Select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setPage(1);
            }}
            aria-label="Filter invoices by status"
          >
            <option value="ALL">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
          <Input
            type="date"
            value={dueFrom}
            onChange={(event) => {
              setDueFrom(event.target.value);
              setPage(1);
            }}
            aria-label="Due date from"
          />
          <Input
            type="date"
            value={dueTo}
            onChange={(event) => {
              setDueTo(event.target.value);
              setPage(1);
            }}
            aria-label="Due date to"
          />
          <span className="toolbar-count">
            {data?.pagination
              ? `${invoices.length ? (page - 1) * data.pagination.pageSize + 1 : 0}–${(page - 1) * data.pagination.pageSize + invoices.length} of ${data.pagination.total}`
              : `${invoices.length} invoices`}
          </span>
        </div>
      </section>

      {error ? (
        <Alert
          tone="error"
          title="Could not load invoices"
          action={
            <Button variant="secondary" size="sm" onClick={reload}>
              Retry
            </Button>
          }
        >
          {describeApiError(error)}
        </Alert>
      ) : null}

      {loading && !data ? (
        <div className="table-card">
          <div className="table-loading">
            <Spinner label="Loading invoices" />
            <span>Loading invoices…</span>
          </div>
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          title={hasFilters ? 'No invoices match these filters' : 'No invoices yet'}
          description={
            hasFilters
              ? 'Try another search or date range, or clear the filters.'
              : 'Generate an invoice from an active subscription or run billing to create due invoices.'
          }
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                  setDueFrom('');
                  setDueTo('');
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button icon={<Plus size={16} />} onClick={openGenerate}>
                Generate invoice
              </Button>
            )
          }
        />
      ) : (
        <div className="table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Subscription</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Total</th>
                  <th>Balance due</th>
                  <th className="table-actions-head">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <div className="table-primary">
                        <button
                          type="button"
                          className="table-link"
                          onClick={() => setSelected(invoice)}
                        >
                          {invoice.number}
                        </button>
                        <span>
                          {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="table-primary">
                        <strong>{invoice.customerName}</strong>
                        <span>{invoice.customerEmail}</span>
                      </div>
                    </td>
                    <td>{invoice.subscription.number}</td>
                    <td>
                      <div className="invoice-status-cell">
                        <InvoiceStatusBadge status={invoice.status} />
                        {isOverdue(invoice) && <span className="invoice-overdue">Overdue</span>}
                      </div>
                    </td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td className="table-money">{formatMoney(invoice.total)}</td>
                    <td className="table-money">{formatMoney(invoice.balanceDue)}</td>
                    <td className="table-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelected(invoice)}
                        aria-label={`View invoice ${invoice.number}`}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.pagination && data.pagination.totalPages > 1 && (
        <nav className="pagination-controls" aria-label="Invoice pages">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <span>
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= data.pagination.totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </nav>
      )}

      <GenerateInvoiceModal
        open={generateOpen}
        subscriptions={subscriptions}
        loading={loadingSubscriptions}
        error={subscriptionError}
        onClose={() => setGenerateOpen(false)}
        onSubmit={handleGenerate}
      />
      {selected && (
        <InvoiceDetailModal
          invoice={selected}
          onClose={() => setSelected(null)}
          onUpdated={(invoice) => {
            setSelected(invoice);
            reload();
          }}
        />
      )}
    </div>
  );
}

function GenerateInvoiceModal({
  open,
  subscriptions,
  loading,
  error,
  onClose,
  onSubmit
}: {
  open: boolean;
  subscriptions: Subscription[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (input: GenerateInvoiceInput) => Promise<void>;
}) {
  const [subscriptionId, setSubscriptionId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subscriptionId) {
      setSubmitError('Choose an active subscription.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit({
        subscriptionId,
        ...(periodStart ? { periodStart: new Date(periodStart).toISOString() } : {}),
        ...(periodEnd ? { periodEnd: new Date(periodEnd).toISOString() } : {}),
        ...(issueDate ? { issueDate: new Date(issueDate).toISOString() } : {})
      });
      setSubscriptionId('');
      setPeriodStart('');
      setPeriodEnd('');
      setIssueDate('');
    } catch (caught) {
      setSubmitError(describeApiError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate invoice"
      description="Create a draft invoice from an active subscription. Leave dates empty to use the standard billing dates."
      size="md"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Close
          </Button>
          <Button
            type="submit"
            form="generate-invoice-form"
            loading={submitting}
            disabled={loading || subscriptions.length === 0}
          >
            Generate draft
          </Button>
        </>
      }
    >
      <form id="generate-invoice-form" className="form-stack" onSubmit={handleSubmit}>
        {error && <Alert tone="error" title="Could not load active subscriptions">{error}</Alert>}
        {submitError && <Alert tone="error">{submitError}</Alert>}
        {loading ? (
          <div className="table-loading">
            <Spinner label="Loading active subscriptions" />
            <span>Loading active subscriptions…</span>
          </div>
        ) : subscriptions.length === 0 ? (
          <Alert tone="info">There are no active subscriptions available for invoicing.</Alert>
        ) : (
          <Select
            label="Active subscription"
            value={subscriptionId}
            required
            onChange={(event) => setSubscriptionId(event.target.value)}
            data-autofocus
          >
            <option value="">Select a subscription</option>
            {subscriptions.map((subscription) => (
              <option key={subscription.id} value={subscription.id}>
                {subscription.number} — {subscription.customer.name} · {subscription.plan.name}
              </option>
            ))}
          </Select>
        )}
        <div className="form-grid">
          <Input
            label="Period start (optional)"
            type="datetime-local"
            value={periodStart}
            onChange={(event) => setPeriodStart(event.target.value)}
          />
          <Input
            label="Period end (optional)"
            type="datetime-local"
            value={periodEnd}
            onChange={(event) => setPeriodEnd(event.target.value)}
          />
        </div>
        <Input
          label="Issue date (optional)"
          type="datetime-local"
          value={issueDate}
          onChange={(event) => setIssueDate(event.target.value)}
        />
      </form>
    </Modal>
  );
}
