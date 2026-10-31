import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Layers, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Alert } from '../../components/ui/Alert';
import { Badge, FrequencyBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../lib/api';
import { describeApiError } from '../../lib/errors';
import {
  availabilityLabel,
  formatDate,
  formatDateTime,
  formatMoney,
  frequencyLabel,
  frequencySuffix
} from '../../lib/format';
import type { BillingFrequency, Plan } from '../../types';
import { PlanFormModal } from './PlanFormModal';

type FrequencyFilter = 'ALL' | BillingFrequency;

export function PlansPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = user?.role === 'ADMIN';
  const [searchParams] = useSearchParams();
  const openedFromCatalog = useRef(false);

  const load = useCallback(() => api.catalog.listPlans(), []);
  const { data, loading, error, reload } = useAsync(load, [load]);
  const plans = data ?? [];

  const [search, setSearch] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [detail, setDetail] = useState<Plan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (canManage && searchParams.get('new') === '1' && !openedFromCatalog.current) {
      openedFromCatalog.current = true;
      openCreate();
    }
  }, [canManage, searchParams]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return plans.filter((plan) => {
      if (frequencyFilter !== 'ALL' && plan.frequency !== frequencyFilter) return false;
      if (!query) return true;
      return (
        plan.name.toLowerCase().includes(query) ||
        plan.frequency.toLowerCase().includes(query)
      );
    });
  }, [plans, search, frequencyFilter]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditing(plan);
    setDetail(null);
    setFormOpen(true);
  }

  function handleSaved(message: string) {
    toast.success(message);
    setFormOpen(false);
    setEditing(null);
    setDetail(null);
    reload();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.catalog.deletePlan(deleteTarget.id);
      toast.success('Plan removed', `${deleteTarget.name} is no longer available.`);
      setDeleteTarget(null);
      reload();
    } catch (caught) {
      toast.error('Could not remove plan', describeApiError(caught));
    } finally {
      setDeleting(false);
    }
  }

  const hasPlans = plans.length > 0;
  const hasFilters = search.trim().length > 0 || frequencyFilter !== 'ALL';

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Master data"
        title="Plans"
        description="Define pricing, billing cadence, availability, and lifecycle policies."
        actions={
          canManage ? (
            <Button icon={<Plus size={16} />} onClick={openCreate}>
              New plan
            </Button>
          ) : undefined
        }
      />

      <section className="toolbar-card">
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search plans by name or frequency…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search plans"
          />
        </div>
        <div className="toolbar-filters">
          <select
            className="toolbar-select"
            value={frequencyFilter}
            onChange={(event) => setFrequencyFilter(event.target.value as FrequencyFilter)}
            aria-label="Filter plans by frequency"
          >
            <option value="ALL">All frequencies</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
          <span className="toolbar-count">
            {filtered.length} of {plans.length}
          </span>
        </div>
      </section>

      {error ? (
        <Alert
          tone="error"
          title="Could not load plans"
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
            <Spinner label="Loading plans" />
            <span>Loading plans…</span>
          </div>
        </div>
      ) : !hasPlans ? (
        <EmptyState
          icon={<Layers size={24} />}
          title="No plans yet"
          description={
            canManage
              ? 'Create your first subscription plan to make it available in the catalog.'
              : 'Plans will appear here once they are created.'
          }
          action={
            canManage ? (
              <Button icon={<Plus size={16} />} onClick={openCreate}>
                Create plan
              </Button>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={24} />}
          title="No plans match your filters"
          description="Try a different search term or clear the frequency filter."
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setFrequencyFilter('ALL');
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
                <th>Plan</th>
                <th>Price</th>
                <th>Frequency</th>
                <th>Min qty</th>
                <th>Availability</th>
                <th>Policies</th>
                <th className="table-actions-head">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((plan) => (
                <tr key={plan.id}>
                  <td>
                    <div className="table-primary">
                      <strong>{plan.name}</strong>
                      <span>Created {formatDate(plan.createdAt)}</span>
                    </div>
                  </td>
                  <td className="table-money">
                    {formatMoney(plan.price)}
                    <span className="table-suffix">{frequencySuffix(plan.frequency)}</span>
                  </td>
                  <td>
                    <FrequencyBadge frequency={plan.frequency} />
                  </td>
                  <td>{plan.minimumQuantity}</td>
                  <td className="table-muted table-wrap">
                    {availabilityLabel(plan.availableFrom, plan.availableUntil)}
                  </td>
                  <td>
                    <div className="chip-row">
                      {plan.autoClose && <Badge tone="warning">Auto close</Badge>}
                      {plan.allowEarlyClose && <Badge tone="neutral">Early close</Badge>}
                      {plan.allowPause && <Badge tone="info">Pause</Badge>}
                      {plan.allowRenew && <Badge tone="success">Renew</Badge>}
                      {!plan.autoClose &&
                        !plan.allowEarlyClose &&
                        !plan.allowPause &&
                        !plan.allowRenew && <Badge tone="neutral">Standard</Badge>}
                    </div>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setDetail(plan)}
                        aria-label={`View ${plan.name}`}
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => openEdit(plan)}
                            aria-label={`Edit ${plan.name}`}
                            title="Edit plan"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-button icon-button-danger"
                            onClick={() => setDeleteTarget(plan)}
                            aria-label={`Delete ${plan.name}`}
                            title="Delete plan"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PlanFormModal
        open={formOpen}
        plan={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

      <PlanDetailModal
        plan={detail}
        canManage={canManage}
        onClose={() => setDetail(null)}
        onEdit={openEdit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove plan?"
        message={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed from the active catalog. This cannot be undone from this screen.`
            : ''
        }
        confirmLabel="Remove plan"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function PlanDetailModal({
  plan,
  canManage,
  onClose,
  onEdit
}: {
  plan: Plan | null;
  canManage: boolean;
  onClose: () => void;
  onEdit: (plan: Plan) => void;
}) {
  return (
    <Modal
      open={plan !== null}
      onClose={onClose}
      title={plan?.name ?? 'Plan'}
      description={plan ? `${frequencyLabel(plan.frequency)} subscription plan` : undefined}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {canManage && plan && (
            <Button variant="primary" onClick={() => onEdit(plan)}>
              Edit plan
            </Button>
          )}
        </>
      }
    >
      {plan && (
        <div className="detail-stack">
          <div className="detail-grid">
            <div>
              <span>Price</span>
              <strong>
                {formatMoney(plan.price)}
                <small>{frequencySuffix(plan.frequency)}</small>
              </strong>
            </div>
            <div>
              <span>Frequency</span>
              <strong>{frequencyLabel(plan.frequency)}</strong>
            </div>
            <div>
              <span>Minimum quantity</span>
              <strong>{plan.minimumQuantity}</strong>
            </div>
            <div>
              <span>Availability</span>
              <strong>{availabilityLabel(plan.availableFrom, plan.availableUntil)}</strong>
            </div>
          </div>

          <div className="detail-block">
            <h3>Lifecycle policies</h3>
            <div className="policy-list">
              <PolicyRow enabled={plan.autoClose} label="Auto close" />
              <PolicyRow enabled={plan.allowEarlyClose} label="Allow early close" />
              <PolicyRow enabled={plan.allowPause} label="Allow pause" />
              <PolicyRow enabled={plan.allowRenew} label="Allow renew" />
            </div>
          </div>

          <p className="detail-timestamp">Last updated {formatDateTime(plan.updatedAt)}</p>
        </div>
      )}
    </Modal>
  );
}

function PolicyRow({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className="policy-row">
      <span className={enabled ? 'policy-dot is-on' : 'policy-dot'} aria-hidden="true" />
      <span>{label}</span>
      <Badge tone={enabled ? 'success' : 'neutral'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>
    </div>
  );
}
