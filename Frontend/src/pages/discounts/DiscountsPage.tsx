import { useCallback, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Select } from '../../components/ui/FormControls';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/ui/StatCard';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../lib/api';
import { describeApiError } from '../../lib/errors';
import { formatDateTime, formatMoney } from '../../lib/format';
import type { DiscountRule, DiscountRuleListParams, DiscountScope, DiscountType } from '../../types';
import { DiscountRuleFormModal } from './DiscountRuleFormModal';

type TypeFilter = 'ALL' | DiscountType;
type ScopeFilter = 'ALL' | DiscountScope;
type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

function ruleState(rule: DiscountRule) {
  if (!rule.isActive) return 'Inactive';
  if (rule.maxUsageCount !== null && rule.maxUsageCount !== undefined && rule.usageCount >= rule.maxUsageCount) {
    return 'Exhausted';
  }
  const now = Date.now();
  if (rule.startsAt && new Date(rule.startsAt).getTime() > now) return 'Scheduled';
  if (rule.endsAt && new Date(rule.endsAt).getTime() < now) return 'Expired';
  return 'Active';
}

function discountLabel(rule: DiscountRule) {
  return rule.type === 'PERCENTAGE' ? `${Number(rule.value)}%` : formatMoney(rule.value);
}

export function DiscountsPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountRule | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<DiscountRule | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const params: DiscountRuleListParams = {
    page,
    pageSize: 20,
    search: search.trim() || undefined,
    type: typeFilter === 'ALL' ? undefined : typeFilter,
    scope: scopeFilter === 'ALL' ? undefined : scopeFilter,
    isActive: activeFilter === 'ALL' ? undefined : activeFilter === 'ACTIVE'
  };
  const load = useCallback(() => api.discounts.list(params), [search, typeFilter, scopeFilter, activeFilter, page]);
  const { data, loading, error, reload } = useAsync(load, [load]);
  const rules = data?.items ?? [];

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(rule: DiscountRule) {
    setEditing(rule);
    setFormOpen(true);
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await api.discounts.deactivate(deactivateTarget.id);
      toast.success('Discount deactivated', `${deactivateTarget.name} will not be applied to new invoices.`);
      setDeactivateTarget(null);
      reload();
    } catch (caught) {
      toast.error('Could not deactivate discount', describeApiError(caught));
    } finally {
      setDeactivating(false);
    }
  }

  const hasFilters =
    search.trim().length > 0 ||
    typeFilter !== 'ALL' ||
    scopeFilter !== 'ALL' ||
    activeFilter !== 'ALL';
  const pageActiveCount = rules.filter((rule) => ruleState(rule) === 'Active').length;
  const exhaustedCount = rules.filter((rule) => ruleState(rule) === 'Exhausted').length;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Promotion management"
        title="Discount rules"
        description="Define targeted promotions that are evaluated automatically when invoices are generated."
        actions={
          <Button onClick={openCreate}>
            Create discount rule
          </Button>
        }
      />

      <Alert tone="info">
        At most one eligible rule applies to an invoice: the rule producing the highest saving wins.
        Expired, inactive, or exhausted rules are skipped.
      </Alert>

      <section className="stats-grid stats-grid-compact" aria-label="Discount rule summary">
        <StatCard
          label="Rules"
          value={data?.pagination?.total ?? rules.length}
          hint="Matching filters"
          icon={<span aria-hidden="true">%</span>}
          tone="primary"
        />
        <StatCard
          label="Active on this page"
          value={pageActiveCount}
          hint="Currently eligible by date"
          icon={<span aria-hidden="true">✓</span>}
          tone="success"
        />
        <StatCard
          label="Exhausted on this page"
          value={exhaustedCount}
          hint="Usage limit reached"
          icon={<span aria-hidden="true">0</span>}
          tone="warning"
        />
      </section>

      <section className="toolbar-card discount-toolbar">
        <div className="search-field">
          <input
            type="search"
            placeholder="Search discount rules…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            aria-label="Search discount rules"
          />
        </div>
        <div className="toolbar-filters">
          <Select
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value as TypeFilter);
              setPage(1);
            }}
            aria-label="Filter by discount type"
          >
            <option value="ALL">All types</option>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed amount</option>
          </Select>
          <Select
            value={scopeFilter}
            onChange={(event) => {
              setScopeFilter(event.target.value as ScopeFilter);
              setPage(1);
            }}
            aria-label="Filter by scope"
          >
            <option value="ALL">All scopes</option>
            <option value="SUBSCRIPTION">Subscription</option>
            <option value="PRODUCT">Product</option>
          </Select>
          <Select
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value as ActiveFilter);
              setPage(1);
            }}
            aria-label="Filter by activity"
          >
            <option value="ALL">All states</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>
      </section>

      {error ? (
        <Alert
          tone="error"
          title="Could not load discount rules"
          action={<Button variant="secondary" size="sm" onClick={reload}>Retry</Button>}
        >
          {describeApiError(error)}
        </Alert>
      ) : null}

      {loading && !data ? (
        <div className="table-card">
          <div className="table-loading"><Spinner label="Loading discount rules" /><span>Loading discount rules…</span></div>
        </div>
      ) : rules.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true">%</span>}
          title={hasFilters ? 'No rules match these filters' : 'No discount rules yet'}
          description={hasFilters ? 'Adjust the filters or clear them to see more rules.' : 'Create a rule to automatically discount eligible future invoices.'}
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={() => {
                setSearch('');
                setTypeFilter('ALL');
                setScopeFilter('ALL');
                setActiveFilter('ALL');
                setPage(1);
              }}>Clear filters</Button>
            ) : <Button onClick={openCreate}>Create discount rule</Button>
          }
        />
      ) : (
        <div className="table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Discount</th>
                  <th>Scope</th>
                  <th>Eligibility</th>
                  <th>Schedule</th>
                  <th>Usage</th>
                  <th>State</th>
                  <th className="table-actions-head"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => {
                  const state = ruleState(rule);
                  return (
                    <tr key={rule.id}>
                      <td>
                        <div className="table-primary">
                          <strong>{rule.name}</strong>
                          <span>{rule.description || 'No description'}</span>
                        </div>
                      </td>
                      <td><strong>{discountLabel(rule)}</strong></td>
                      <td>
                        <div className="table-primary">
                          <span>{rule.scope === 'PRODUCT' ? 'Product' : 'Subscription'}</span>
                          {rule.product && <strong>{rule.product.name}</strong>}
                        </div>
                      </td>
                      <td>
                        <div className="table-primary">
                          <span>Min. {formatMoney(rule.minPurchase)}</span>
                          <span>Qty {rule.minQuantity}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-primary">
                          <span>From {rule.startsAt ? formatDateTime(rule.startsAt) : 'Any time'}</span>
                          <span>Until {rule.endsAt ? formatDateTime(rule.endsAt) : 'No expiry'}</span>
                        </div>
                      </td>
                      <td>
                        {rule.usageCount}
                        {rule.maxUsageCount == null ? ' / unlimited' : ` / ${rule.maxUsageCount}`}
                      </td>
                      <td><RuleStateBadge state={state} /></td>
                      <td className="table-actions">
                        <div className="table-action-group">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}>Edit</Button>
                          {rule.isActive && (
                            <Button variant="ghost" size="sm" onClick={() => setDeactivateTarget(rule)}>
                              Deactivate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.pagination && data.pagination.totalPages > 1 && (
        <nav className="pagination-controls" aria-label="Discount rule pages">
          <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</Button>
          <span>Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} rules</span>
          <Button variant="secondary" size="sm" disabled={page >= data.pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)}>Next</Button>
        </nav>
      )}

      <DiscountRuleFormModal
        open={formOpen}
        rule={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={(message) => {
          toast.success(message);
          setFormOpen(false);
          setEditing(null);
          reload();
        }}
      />
      <ConfirmDialog
        open={deactivateTarget !== null}
        title="Deactivate discount rule?"
        message={`${deactivateTarget?.name ?? 'This rule'} will stop applying to new invoices. Existing invoice discount snapshots will remain unchanged.`}
        confirmLabel="Deactivate"
        loading={deactivating}
        onConfirm={() => void handleDeactivate()}
        onClose={() => {
          if (!deactivating) setDeactivateTarget(null);
        }}
      />
    </div>
  );
}

function RuleStateBadge({ state }: { state: string }) {
  const tone = state === 'Active' ? 'success' : state === 'Exhausted' || state === 'Expired' ? 'warning' : 'neutral';
  return <Badge tone={tone}>{state}</Badge>;
}
