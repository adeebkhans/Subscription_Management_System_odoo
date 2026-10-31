import { useCallback, useMemo, useState } from 'react';
import { CreditCard, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Alert } from '../../components/ui/Alert';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/ui/StatCard';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../lib/api';
import { describeApiError } from '../../lib/errors';
import { formatDate, formatDateTime, paymentTermDueLabel } from '../../lib/format';
import type { PaymentTerm } from '../../types';
import { PaymentTermFormModal } from './PaymentTermFormModal';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export function PaymentTermsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = user?.role === 'ADMIN';

  const load = useCallback(() => api.paymentTerms.list(), []);
  const { data, loading, error, reload } = useAsync(load, [load]);
  const terms = data ?? [];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentTerm | null>(null);
  const [detail, setDetail] = useState<PaymentTerm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentTerm | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return terms.filter((term) => {
      if (statusFilter === 'ACTIVE' && !term.isActive) return false;
      if (statusFilter === 'INACTIVE' && term.isActive) return false;
      if (!query) return true;
      return term.name.toLowerCase().includes(query) || String(term.dueDays).includes(query);
    });
  }, [terms, search, statusFilter]);

  const activeCount = terms.filter((term) => term.isActive).length;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(term: PaymentTerm) {
    setEditing(term);
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

  async function handleDeactivate() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.paymentTerms.deactivate(deleteTarget.id);
      toast.success('Payment term deactivated', `${deleteTarget.name} is no longer available.`);
      setDeleteTarget(null);
      setDetail(null);
      reload();
    } catch (caught) {
      toast.error('Could not deactivate payment term', describeApiError(caught));
    } finally {
      setDeleting(false);
    }
  }

  const hasTerms = terms.length > 0;
  const hasFilters = search.trim().length > 0 || statusFilter !== 'ALL';

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Billing setup"
        title="Payment terms"
        description="Define when invoices fall due and attach those rules to subscriptions."
        actions={
          canManage ? (
            <Button icon={<Plus size={16} />} onClick={openCreate}>
              New payment term
            </Button>
          ) : undefined
        }
      />

      <section className="stats-grid stats-grid-compact" aria-label="Payment term summary">
        <StatCard
          label="Payment terms"
          value={terms.length}
          hint="All terms"
          icon={<CreditCard size={20} />}
          tone="primary"
        />
        <StatCard
          label="Active terms"
          value={activeCount}
          hint="Available to attach"
          icon={<CreditCard size={20} />}
          tone="success"
        />
        <StatCard
          label="Inactive terms"
          value={terms.length - activeCount}
          hint="Hidden from new work"
          icon={<CreditCard size={20} />}
          tone="warning"
        />
      </section>

      <section className="toolbar-card">
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search payment terms…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search payment terms"
          />
        </div>
        <div className="toolbar-filters">
          <select
            className="toolbar-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            aria-label="Filter payment terms by status"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <span className="toolbar-count">
            {filtered.length} of {terms.length}
          </span>
        </div>
      </section>

      {error ? (
        <Alert
          tone="error"
          title="Could not load payment terms"
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
            <Spinner label="Loading payment terms" />
            <span>Loading payment terms…</span>
          </div>
        </div>
      ) : !hasTerms ? (
        <EmptyState
          icon={<CreditCard size={24} />}
          title="No payment terms yet"
          description={
            canManage
              ? 'Create your first payment term so subscriptions can carry a due-date rule.'
              : 'Payment terms will appear here once an administrator creates them.'
          }
          action={
            canManage ? (
              <Button icon={<Plus size={16} />} onClick={openCreate}>
                Create payment term
              </Button>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={24} />}
          title="No payment terms match your filters"
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
                <th>Payment term</th>
                <th>Due window</th>
                <th>Status</th>
                <th>Created</th>
                <th className="table-actions-head">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((term) => (
                <tr key={term.id}>
                  <td>
                    <div className="table-primary">
                      <strong>{term.name}</strong>
                      <span>{paymentTermDueLabel(term.dueDays)}</span>
                    </div>
                  </td>
                  <td className="table-money">{term.dueDays} days</td>
                  <td>
                    <StatusBadge active={term.isActive} />
                  </td>
                  <td className="table-muted">{formatDate(term.createdAt)}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setDetail(term)}
                        aria-label={`View ${term.name}`}
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => openEdit(term)}
                            aria-label={`Edit ${term.name}`}
                            title="Edit payment term"
                          >
                            <Pencil size={16} />
                          </button>
                          {term.isActive && (
                            <button
                              type="button"
                              className="icon-button icon-button-danger"
                              onClick={() => setDeleteTarget(term)}
                              aria-label={`Deactivate ${term.name}`}
                              title="Deactivate payment term"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
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

      <PaymentTermFormModal
        open={formOpen}
        term={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

      <PaymentTermDetailModal
        term={detail}
        canManage={canManage}
        onClose={() => setDetail(null)}
        onEdit={openEdit}
        onDeactivate={(term) => setDeleteTarget(term)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Deactivate payment term?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" will no longer be available for new subscriptions. Terms already in use cannot be deactivated.`
            : ''
        }
        confirmLabel="Deactivate term"
        loading={deleting}
        onConfirm={handleDeactivate}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function PaymentTermDetailModal({
  term,
  canManage,
  onClose,
  onEdit,
  onDeactivate
}: {
  term: PaymentTerm | null;
  canManage: boolean;
  onClose: () => void;
  onEdit: (term: PaymentTerm) => void;
  onDeactivate: (term: PaymentTerm) => void;
}) {
  return (
    <Modal
      open={term !== null}
      onClose={onClose}
      title={term?.name ?? 'Payment term'}
      description={term ? paymentTermDueLabel(term.dueDays) : undefined}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {canManage && term && (
            <>
              {term.isActive && (
                <Button variant="danger" onClick={() => onDeactivate(term)}>
                  Deactivate
                </Button>
              )}
              <Button variant="primary" onClick={() => onEdit(term)}>
                Edit term
              </Button>
            </>
          )}
        </>
      }
    >
      {term && (
        <div className="detail-stack">
          <div className="detail-grid">
            <div>
              <span>Status</span>
              <strong>
                <StatusBadge active={term.isActive} />
              </strong>
            </div>
            <div>
              <span>Due days</span>
              <strong>{term.dueDays}</strong>
            </div>
            <div>
              <span>Created</span>
              <strong>{formatDate(term.createdAt)}</strong>
            </div>
            <div>
              <span>Updated</span>
              <strong>{formatDateTime(term.updatedAt)}</strong>
            </div>
          </div>
          <p className="detail-timestamp">
            {term.isActive
              ? 'This term can be attached to new subscriptions.'
              : 'This term is inactive and hidden from new subscriptions.'}
          </p>
        </div>
      )}
    </Modal>
  );
}
