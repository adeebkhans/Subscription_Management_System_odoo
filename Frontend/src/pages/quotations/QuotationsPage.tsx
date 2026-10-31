import { useCallback, useMemo, useState } from 'react';
import { Eye, FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Alert } from '../../components/ui/Alert';
import { Badge, StatusBadge } from '../../components/ui/Badge';
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
import { formatDate, formatDateTime, formatMoney } from '../../lib/format';
import type { QuotationTemplate, QuotationTemplateLine } from '../../types';
import { QuotationFormModal } from './QuotationFormModal';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export function QuotationsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const load = useCallback(() => api.quotations.list(), []);
  const { data, loading, error, reload } = useAsync(load, [load]);
  const quotations = data ?? [];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QuotationTemplate | null>(null);
  const [detail, setDetail] = useState<QuotationTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuotationTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return quotations.filter((quotation) => {
      if (statusFilter === 'ACTIVE' && !quotation.isActive) return false;
      if (statusFilter === 'INACTIVE' && quotation.isActive) return false;
      if (!query) return true;
      return (
        quotation.name.toLowerCase().includes(query) ||
        (quotation.description ?? '').toLowerCase().includes(query) ||
        (quotation.plan?.name ?? '').toLowerCase().includes(query)
      );
    });
  }, [quotations, search, statusFilter]);

  const activeCount = quotations.filter((quotation) => quotation.isActive).length;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(quotation: QuotationTemplate) {
    setEditing(quotation);
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
      await api.quotations.deactivate(deleteTarget.id);
      toast.success(
        'Quotation template deactivated',
        `${deleteTarget.name} is no longer available for new subscriptions.`
      );
      setDeleteTarget(null);
      setDetail(null);
      reload();
    } catch (caught) {
      toast.error('Could not deactivate quotation template', describeApiError(caught));
    } finally {
      setDeleting(false);
    }
  }

  const hasQuotations = quotations.length > 0;
  const hasFilters = search.trim().length > 0 || statusFilter !== 'ALL';

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Sales tools"
        title="Quotation templates"
        description="Create reusable product bundles that can be converted into subscriptions."
        actions={
          canManage ? (
            <Button icon={<Plus size={16} />} onClick={openCreate}>
              New template
            </Button>
          ) : undefined
        }
      />

      <section className="stats-grid stats-grid-compact" aria-label="Quotation summary">
        <StatCard
          label="Templates"
          value={quotations.length}
          hint="All templates"
          icon={<FileText size={20} />}
          tone="primary"
        />
        <StatCard
          label="Active templates"
          value={activeCount}
          hint="Available to sell"
          icon={<FileText size={20} />}
          tone="success"
        />
        <StatCard
          label="Inactive templates"
          value={quotations.length - activeCount}
          hint="Hidden from new work"
          icon={<FileText size={20} />}
          tone="warning"
        />
      </section>

      <section className="toolbar-card">
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search templates, plans, or descriptions…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search quotation templates"
          />
        </div>
        <div className="toolbar-filters">
          <select
            className="toolbar-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            aria-label="Filter quotation templates by status"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <span className="toolbar-count">
            {filtered.length} of {quotations.length}
          </span>
        </div>
      </section>

      {error ? (
        <Alert
          tone="error"
          title="Could not load quotation templates"
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
            <Spinner label="Loading quotation templates" />
            <span>Loading quotation templates…</span>
          </div>
        </div>
      ) : !hasQuotations ? (
        <EmptyState
          icon={<FileText size={24} />}
          title="No quotation templates yet"
          description={
            canManage
              ? 'Build a reusable package of products and validity rules for the sales team.'
              : 'Quotation templates will appear here once they are created.'
          }
          action={
            canManage ? (
              <Button icon={<Plus size={16} />} onClick={openCreate}>
                Create template
              </Button>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={24} />}
          title="No templates match your filters"
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
                <th>Template</th>
                <th>Plan</th>
                <th>Lines</th>
                <th>Validity</th>
                <th>Status</th>
                <th>Created</th>
                <th className="table-actions-head">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((quotation) => (
                <tr key={quotation.id}>
                  <td>
                    <div className="table-primary">
                      <strong>{quotation.name}</strong>
                      <span>{quotation.description?.trim() || 'No description'}</span>
                    </div>
                  </td>
                  <td className="table-muted">
                    {quotation.plan?.name ?? <Badge tone="neutral">No plan</Badge>}
                  </td>
                  <td>
                    <Badge tone="neutral">{quotation.lines.length} lines</Badge>
                  </td>
                  <td className="table-money">{quotation.validityDays} days</td>
                  <td>
                    <StatusBadge active={quotation.isActive} />
                  </td>
                  <td className="table-muted">{formatDate(quotation.createdAt)}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setDetail(quotation)}
                        aria-label={`View ${quotation.name}`}
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => openEdit(quotation)}
                            aria-label={`Edit ${quotation.name}`}
                            title="Edit template"
                          >
                            <Pencil size={16} />
                          </button>
                          {quotation.isActive && (
                            <button
                              type="button"
                              className="icon-button icon-button-danger"
                              onClick={() => setDeleteTarget(quotation)}
                              aria-label={`Deactivate ${quotation.name}`}
                              title="Deactivate template"
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

      <QuotationFormModal
        open={formOpen}
        quotation={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

      <QuotationDetailModal
        quotation={detail}
        canManage={canManage}
        onClose={() => setDetail(null)}
        onEdit={openEdit}
        onDeactivate={(quotation) => setDeleteTarget(quotation)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Deactivate quotation template?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" will no longer be available for new subscriptions. Templates used by open subscriptions cannot be deactivated.`
            : ''
        }
        confirmLabel="Deactivate template"
        loading={deleting}
        onConfirm={handleDeactivate}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function lineAmount(line: QuotationTemplateLine): number {
  const unitPrice =
    line.unitPrice === null
      ? Number(line.product?.salesPrice ?? 0) + Number(line.variant?.extraPrice ?? 0)
      : Number(line.unitPrice);
  return Number(line.quantity) * unitPrice;
}

function QuotationDetailModal({
  quotation,
  canManage,
  onClose,
  onEdit,
  onDeactivate
}: {
  quotation: QuotationTemplate | null;
  canManage: boolean;
  onClose: () => void;
  onEdit: (quotation: QuotationTemplate) => void;
  onDeactivate: (quotation: QuotationTemplate) => void;
}) {
  const subtotal =
    quotation?.lines.reduce((total, line) => total + lineAmount(line), 0) ?? 0;
  const tax =
    quotation?.lines.reduce(
      (total, line) => total + (lineAmount(line) * Number(line.taxRate)) / 100,
      0
    ) ?? 0;

  return (
    <Modal
      open={quotation !== null}
      onClose={onClose}
      title={quotation?.name ?? 'Quotation template'}
      description={
        quotation
          ? `${quotation.validityDays} day validity${quotation.plan ? ` · ${quotation.plan.name}` : ''}`
          : undefined
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {canManage && quotation && (
            <>
              {quotation.isActive && (
                <Button variant="danger" onClick={() => onDeactivate(quotation)}>
                  Deactivate
                </Button>
              )}
              <Button variant="primary" onClick={() => onEdit(quotation)}>
                Edit template
              </Button>
            </>
          )}
        </>
      }
    >
      {quotation && (
        <div className="detail-stack">
          <div className="detail-grid">
            <div>
              <span>Status</span>
              <strong>
                <StatusBadge active={quotation.isActive} />
              </strong>
            </div>
            <div>
              <span>Plan</span>
              <strong>{quotation.plan?.name ?? 'No plan'}</strong>
            </div>
            <div>
              <span>Validity</span>
              <strong>{quotation.validityDays} days</strong>
            </div>
            <div>
              <span>Created</span>
              <strong>{formatDate(quotation.createdAt)}</strong>
            </div>
          </div>

          <div className="detail-block">
            <h3>Description</h3>
            <p>{quotation.description?.trim() || 'No description has been added.'}</p>
          </div>

          <div className="detail-block">
            <h3>Product lines</h3>
            {quotation.lines.length > 0 ? (
              <div className="mini-table-wrap">
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Variant</th>
                      <th>Qty</th>
                      <th>Unit price</th>
                      <th>Tax</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.lines.map((line) => (
                      <tr key={line.id}>
                        <td>{line.product?.name ?? 'Product'}</td>
                        <td>
                          {line.variant
                            ? `${line.variant.attribute}: ${line.variant.value}`
                            : 'Base price'}
                        </td>
                        <td>{line.quantity}</td>
                        <td>
                          {formatMoney(
                            line.unitPrice === null
                              ? Number(line.product?.salesPrice ?? 0) +
                                  Number(line.variant?.extraPrice ?? 0)
                              : line.unitPrice
                          )}
                        </td>
                        <td>{Number(line.taxRate)}%</td>
                        <td>{formatMoney(lineAmount(line))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="detail-empty">This template has no product lines.</p>
            )}
          </div>

          <div className="detail-totals">
            <div>
              <span>Subtotal</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>
            <div>
              <span>Tax</span>
              <strong>{formatMoney(tax)}</strong>
            </div>
            <div>
              <span>Estimated total</span>
              <strong>{formatMoney(subtotal + tax)}</strong>
            </div>
          </div>

          <p className="detail-timestamp">Last updated {formatDateTime(quotation.updatedAt)}</p>
        </div>
      )}
    </Modal>
  );
}
