import { useCallback, useMemo, useState } from 'react';
import {
  BarChart3,
  CircleDollarSign,
  Clock3,
  FileWarning,
  RefreshCw,
  Search,
  Users
} from 'lucide-react';
import { Alert } from '../../components/ui/Alert';
import { InvoiceStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input, Select } from '../../components/ui/FormControls';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/ui/StatCard';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../lib/api';
import { describeApiError } from '../../lib/errors';
import { formatDate, formatDateTime, formatMoney } from '../../lib/format';
import type {
  FinanceReportParams,
  Invoice,
  InvoiceStatus,
  OverdueInvoiceParams,
  Plan
} from '../../types';
import { InvoiceDetailModal } from '../invoices/InvoiceDetailModal';

type StatusFilter = 'ALL' | InvoiceStatus;
type OverdueStatus = 'CONFIRMED' | 'PAID';

function dateBound(value: string, endOfDay = false) {
  if (!value) return undefined;
  return `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`;
}

export function FinanceReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [asOfDate, setAsOfDate] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [planId, setPlanId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<StatusFilter>('ALL');
  const [overdueStatus, setOverdueStatus] = useState<OverdueStatus>('CONFIRMED');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Invoice | null>(null);

  const financeParams = useMemo<FinanceReportParams>(
    () => ({
      from: dateBound(from),
      to: dateBound(to, true),
      asOf: dateBound(asOfDate, true),
      customerId: customerId || undefined,
      planId: planId || undefined,
      status: paymentStatus === 'ALL' ? undefined : paymentStatus
    }),
    [from, to, asOfDate, customerId, planId, paymentStatus]
  );
  const overdueParams = useMemo<OverdueInvoiceParams>(
    () => ({
      ...financeParams,
      page,
      pageSize: 20,
      search: search.trim() || undefined,
      status: overdueStatus
    }),
    [financeParams, page, search, overdueStatus]
  );
  const loadFinance = useCallback(() => api.reports.finance(financeParams), [financeParams]);
  const loadOverdue = useCallback(
    () => api.reports.overdueInvoices(overdueParams),
    [overdueParams]
  );
  const finance = useAsync(loadFinance, [loadFinance]);
  const overdue = useAsync(loadOverdue, [loadOverdue]);
  const customers = useAsync(() => api.users.listCustomers(), []);
  const plans = useAsync(() => api.catalog.listPlans({}), []);
  const customerItems = customers.data ?? [];
  const planItems = plans.data ?? [];
  const overdueItems = overdue.data?.items ?? [];
  const pagination = overdue.data?.pagination;

  function resetPage() {
    setPage(1);
  }

  function refreshReports() {
    finance.reload();
    overdue.reload();
  }

  function clearFilters() {
    setFrom('');
    setTo('');
    setAsOfDate('');
    setCustomerId('');
    setPlanId('');
    setPaymentStatus('ALL');
    setOverdueStatus('CONFIRMED');
    setSearch('');
    setPage(1);
  }

  const hasFilters =
    Boolean(from || to || asOfDate || customerId || planId || search) ||
    paymentStatus !== 'ALL' ||
    overdueStatus !== 'CONFIRMED';

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Finance and collections"
        title="Finance reports"
        description="Review revenue, outstanding balances, and overdue invoices from committed billing records."
        actions={
          <Button
            variant="secondary"
            icon={<RefreshCw size={16} />}
            onClick={refreshReports}
            loading={finance.loading || overdue.loading}
          >
            Refresh report
          </Button>
        }
      />

      <section className="toolbar-card invoice-toolbar" aria-label="Report filters">
        <div className="toolbar-filters invoice-filters">
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => {
              setFrom(event.target.value);
              resetPage();
            }}
            aria-label="Report period from"
          />
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => {
              setTo(event.target.value);
              resetPage();
            }}
            aria-label="Report period to"
          />
          <Input
            type="date"
            value={asOfDate}
            onChange={(event) => {
              setAsOfDate(event.target.value);
              resetPage();
            }}
            aria-label="Overdue as of date"
          />
          <Select
            value={customerId}
            onChange={(event) => {
              setCustomerId(event.target.value);
              resetPage();
            }}
            aria-label="Filter reports by customer"
          >
            <option value="">All customers</option>
            {customerItems.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} ({customer.email})
              </option>
            ))}
          </Select>
          <Select
            value={planId}
            onChange={(event) => {
              setPlanId(event.target.value);
              resetPage();
            }}
            aria-label="Filter reports by plan"
          >
            <option value="">All plans</option>
            {planItems.map((plan: Plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </Select>
          <Select
            value={paymentStatus}
            onChange={(event) => {
              setPaymentStatus(event.target.value as StatusFilter);
              resetPage();
            }}
            aria-label="Filter collected revenue by invoice status"
          >
            <option value="ALL">All collected statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>
        <p className="field-hint">
          The period filters collected payments by payment date, outstanding invoices by issue
          date, and overdue invoices by due date. Overdue balance is evaluated{' '}
          {asOfDate ? `through ${formatDate(asOfDate)}` : 'as of now'}.
        </p>
      </section>

      {customers.error !== null && (
        <Alert tone="error" title="Could not load customer filter options">
          {describeApiError(customers.error)}
        </Alert>
      )}

      {plans.error !== null && (
        <Alert tone="error" title="Could not load plan filter options">
          {describeApiError(plans.error)}
        </Alert>
      )}

      {finance.error !== null && (
        <Alert tone="error" title="Could not load finance summary">
          {describeApiError(finance.error)}
        </Alert>
      )}

      {finance.loading && !finance.data ? (
        <div className="table-card">
          <div className="table-loading">
            <Spinner label="Loading finance summary" />
            <span>Loading finance summary…</span>
          </div>
        </div>
      ) : finance.data ? (
        <section className="stats-grid" aria-label="Finance summary">
          <StatCard
            label="Active subscriptions"
            value={finance.data.activeSubscriptions}
            hint="Active and paused"
            icon={<Users size={20} />}
            tone="primary"
          />
          <StatCard
            label="Collected revenue"
            value={formatMoney(finance.data.collectedRevenue)}
            hint="Payments in selected period"
            icon={<CircleDollarSign size={20} />}
            tone="success"
          />
          <StatCard
            label="Outstanding revenue"
            value={formatMoney(finance.data.outstandingRevenue)}
            hint={`${finance.data.outstandingInvoiceCount} confirmed invoices`}
            icon={<BarChart3 size={20} />}
            tone="warning"
          />
          <StatCard
            label="Overdue invoices"
            value={finance.data.overdueInvoices}
            hint="Confirmed invoices past due"
            icon={<FileWarning size={20} />}
            tone={finance.data.overdueInvoices > 0 ? 'warning' : 'success'}
          />
          <StatCard
            label="Overdue balance"
            value={formatMoney(finance.data.overdueAmount)}
            hint={`As of ${formatDateTime(finance.data.asOf)}`}
            icon={<Clock3 size={20} />}
            tone={finance.data.overdueAmount > 0 ? 'warning' : 'success'}
          />
        </section>
      ) : null}

      <section className="page-stack" aria-labelledby="overdue-invoices-heading">
        <header className="page-header">
          <div className="page-header-copy">
            <p className="page-eyebrow">Collections</p>
            <h2 id="overdue-invoices-heading">Overdue invoices</h2>
            <p className="page-description">
              Search and inspect overdue balances. Select an invoice to review its details or
              record a payment.
            </p>
          </div>
        </header>
        <div className="toolbar-card invoice-toolbar">
          <div className="search-field">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search invoice or customer…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
              aria-label="Search overdue invoices"
            />
          </div>
          <div className="toolbar-filters invoice-filters">
            <Select
              value={overdueStatus}
              onChange={(event) => {
                setOverdueStatus(event.target.value as OverdueStatus);
                resetPage();
              }}
              aria-label="Filter overdue invoices by status"
            >
              <option value="CONFIRMED">Confirmed balances</option>
              <option value="PAID">Paid invoices</option>
            </Select>
            <span className="toolbar-count">
              {pagination ? `${pagination.total} matching invoices` : `${overdueItems.length} invoices`}
            </span>
          </div>
        </div>

        {overdue.error !== null && (
          <Alert tone="error" title="Could not load overdue invoices">
            {describeApiError(overdue.error)}
          </Alert>
        )}

        {overdue.loading && !overdue.data ? (
          <div className="table-card">
            <div className="table-loading">
              <Spinner label="Loading overdue invoices" />
              <span>Loading overdue invoices…</span>
            </div>
          </div>
        ) : overdueItems.length === 0 ? (
          <EmptyState
            icon={<FileWarning size={24} />}
            title={hasFilters ? 'No invoices match these filters' : 'No overdue invoices'}
            description={
              hasFilters
                ? 'Try a different search, date range, or status, or clear the filters.'
                : 'No confirmed invoice balances are overdue as of the selected date.'
            }
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
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
                    <th>Plan</th>
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
                  {overdueItems.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <button
                          type="button"
                          className="table-link"
                          onClick={() => setSelected(invoice)}
                        >
                          {invoice.number}
                        </button>
                      </td>
                      <td>
                        <div className="table-primary">
                          <strong>{invoice.customerName}</strong>
                          <span>{invoice.customerEmail}</span>
                        </div>
                      </td>
                      <td>{invoice.subscription.plan.name}</td>
                      <td>
                        <InvoiceStatusBadge status={invoice.status} />
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

        {pagination && pagination.totalPages > 1 && (
          <nav className="pagination-controls" aria-label="Overdue invoice pages">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || overdue.loading}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </Button>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pagination.totalPages || overdue.loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </section>

      {selected && (
        <InvoiceDetailModal
          invoice={selected}
          onClose={() => setSelected(null)}
          onUpdated={(invoice) => {
            setSelected(invoice);
            refreshReports();
          }}
        />
      )}
    </div>
  );
}
