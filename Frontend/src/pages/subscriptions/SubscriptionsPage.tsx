import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, Eye, Plus, Search } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Alert } from '../../components/ui/Alert';
import { SubscriptionStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/ui/StatCard';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../lib/api';
import { describeApiError } from '../../lib/errors';
import { formatDate, formatMoney } from '../../lib/format';
import type { Subscription, SubscriptionStatus } from '../../types';
import { SubscriptionFormModal } from './SubscriptionFormModal';

type StatusFilter = 'ALL' | SubscriptionStatus;

export function SubscriptionsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const load = useCallback(() => api.subscriptions.list(), []);
  const { data, loading, error, reload } = useAsync(load, [load]);
  const subscriptions = data ?? [];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return subscriptions.filter((subscription) => {
      if (statusFilter !== 'ALL' && subscription.status !== statusFilter) return false;
      if (!query) return true;
      return (
        subscription.number.toLowerCase().includes(query) ||
        subscription.customer.name.toLowerCase().includes(query) ||
        subscription.customer.email.toLowerCase().includes(query) ||
        subscription.plan.name.toLowerCase().includes(query)
      );
    });
  }, [subscriptions, search, statusFilter]);

  const activeCount = subscriptions.filter((entry) => entry.status === 'ACTIVE').length;
  const pausedCount = subscriptions.filter((entry) => entry.status === 'PAUSED').length;
  const openCount = subscriptions.filter((entry) =>
    ['DRAFT', 'QUOTATION', 'CONFIRMED'].includes(entry.status)
  ).length;

  function handleCreated(subscription: Subscription) {
    toast.success(
      'Subscription created',
      `${subscription.number} is ready for the ${subscription.customer.name}.`
    );
    setFormOpen(false);
    navigate(`/app/subscriptions/${subscription.id}`);
  }

  const hasSubscriptions = subscriptions.length > 0;
  const hasFilters = search.trim().length > 0 || statusFilter !== 'ALL';

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Revenue operations"
        title="Subscriptions"
        description="Track every agreement from draft and quotation through activation, pause, and renewal."
        actions={
          canManage ? (
            <Button icon={<Plus size={16} />} onClick={() => setFormOpen(true)}>
              New subscription
            </Button>
          ) : undefined
        }
      />

      <section className="stats-grid stats-grid-compact" aria-label="Subscription summary">
        <StatCard
          label="Subscriptions"
          value={subscriptions.length}
          hint="All agreements"
          icon={<CalendarClock size={20} />}
          tone="primary"
        />
        <StatCard
          label="Active"
          value={activeCount}
          hint="Currently running"
          icon={<CalendarClock size={20} />}
          tone="success"
        />
        <StatCard
          label="Paused"
          value={pausedCount}
          hint="Temporarily on hold"
          icon={<CalendarClock size={20} />}
          tone="warning"
        />
        <StatCard
          label="In progress"
          value={openCount}
          hint="Draft, quotation, or confirmed"
          icon={<CalendarClock size={20} />}
          tone="info"
        />
      </section>

      <section className="toolbar-card">
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search number, customer, or plan…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search subscriptions"
          />
        </div>
        <div className="toolbar-filters">
          <select
            className="toolbar-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            aria-label="Filter subscriptions by status"
          >
            <option value="ALL">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="QUOTATION">Quotation</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <span className="toolbar-count">
            {filtered.length} of {subscriptions.length}
          </span>
        </div>
      </section>

      {error ? (
        <Alert
          tone="error"
          title="Could not load subscriptions"
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
            <Spinner label="Loading subscriptions" />
            <span>Loading subscriptions…</span>
          </div>
        </div>
      ) : !hasSubscriptions ? (
        <EmptyState
          icon={<CalendarClock size={24} />}
          title="No subscriptions yet"
          description={
            canManage
              ? 'Create the first subscription from a plan or quotation template.'
              : 'Subscriptions will appear here once they are created.'
          }
          action={
            canManage ? (
              <Button icon={<Plus size={16} />} onClick={() => setFormOpen(true)}>
                Create subscription
              </Button>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={24} />}
          title="No subscriptions match your filters"
          description="Try a different search term or clear the status filter."
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subscription</th>
                <th>Customer</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Start</th>
                <th>Expiry</th>
                <th>Total</th>
                <th className="table-actions-head">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((subscription) => (
                <tr key={subscription.id}>
                  <td>
                    <div className="table-primary">
                      <Link to={`/app/subscriptions/${subscription.id}`}>
                        {subscription.number}
                      </Link>
                      <span>{subscription.lines.length} lines</span>
                    </div>
                  </td>
                  <td>
                    <div className="table-primary">
                      <strong>{subscription.customer.name}</strong>
                      <span>{subscription.customer.email}</span>
                    </div>
                  </td>
                  <td className="table-muted">{subscription.plan.name}</td>
                  <td>
                    <SubscriptionStatusBadge status={subscription.status} />
                  </td>
                  <td className="table-muted">{formatDate(subscription.startDate)}</td>
                  <td className="table-muted">
                    {subscription.expiryDate ? formatDate(subscription.expiryDate) : 'Open-ended'}
                  </td>
                  <td className="table-money">{formatMoney(subscription.total)}</td>
                  <td>
                    <div className="table-actions">
                      <Link
                        to={`/app/subscriptions/${subscription.id}`}
                        className="icon-button"
                        aria-label={`View ${subscription.number}`}
                        title="View subscription"
                      >
                        <Eye size={16} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SubscriptionFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
