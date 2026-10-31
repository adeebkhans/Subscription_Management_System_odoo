import { useCallback, useMemo, useState } from 'react';
import { Pencil, Plus, Search, ShieldCheck, UserRound, UserX, Users } from 'lucide-react';
import { Alert } from '../../components/ui/Alert';
import { RoleBadge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/ui/StatCard';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../lib/api';
import { describeApiError } from '../../lib/errors';
import { formatDate, initials, roleLabel } from '../../lib/format';
import type { Role, User } from '../../types';
import { StaffFormModal } from './StaffFormModal';

type RoleFilter = 'ALL' | Role;

export function StaffPage() {
  const toast = useToast();
  const load = useCallback(() => api.users.list(), []);
  const { data, loading, error, reload } = useAsync(load, [load]);
  const users = data ?? [];

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [disableTarget, setDisableTarget] = useState<User | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((member) => {
      if (roleFilter !== 'ALL' && member.role !== roleFilter) return false;
      if (!query) return true;
      return (
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query)
      );
    });
  }, [users, search, roleFilter]);

  const adminCount = users.filter((member) => member.role === 'ADMIN').length;
  const staffCount = users.filter((member) => member.role === 'STAFF').length;
  const customerCount = users.filter((member) => member.role === 'CUSTOMER').length;

  function handleSaved(message: string) {
    toast.success(message);
    setFormOpen(false);
    reload();
  }

  function openCreate() {
    setEditingUser(null);
    setFormOpen(true);
  }

  async function handleDisable() {
    if (!disableTarget) return;
    setUpdatingStatus(true);
    try {
      await api.users.setActive(disableTarget.id, false);
      toast.success('Staff account disabled', `${disableTarget.name} can no longer sign in.`);
      setDisableTarget(null);
      reload();
    } catch (caught) {
      toast.error('Could not disable staff account', describeApiError(caught));
    } finally {
      setUpdatingStatus(false);
    }
  }

  const hasUsers = users.length > 0;
  const hasFilters = search.trim().length > 0 || roleFilter !== 'ALL';

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Administration"
        title="Team & users"
        description="Create staff accounts and review every account in the workspace."
        actions={
          <Button icon={<Plus size={16} />} onClick={openCreate}>
            Add team member
          </Button>
        }
      />

      <section className="stats-grid stats-grid-compact" aria-label="User summary">
        <StatCard
          label="Administrators"
          value={adminCount}
          icon={<ShieldCheck size={20} />}
          tone="primary"
        />
        <StatCard label="Staff" value={staffCount} icon={<Users size={20} />} tone="info" />
        <StatCard
          label="Customers"
          value={customerCount}
          icon={<UserRound size={20} />}
          tone="success"
        />
        <StatCard
          label="Total accounts"
          value={users.length}
          icon={<Users size={20} />}
          tone="warning"
        />
      </section>

      <section className="toolbar-card">
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search users"
          />
        </div>
        <div className="toolbar-filters">
          <select
            className="toolbar-select"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
            aria-label="Filter users by role"
          >
            <option value="ALL">All roles</option>
            <option value="ADMIN">Administrators</option>
            <option value="STAFF">Staff</option>
            <option value="CUSTOMER">Customers</option>
          </select>
          <span className="toolbar-count">
            {filtered.length} of {users.length}
          </span>
        </div>
      </section>

      {error ? (
        <Alert
          tone="error"
          title="Could not load users"
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
            <Spinner label="Loading users" />
            <span>Loading users…</span>
          </div>
        </div>
      ) : !hasUsers ? (
        <EmptyState
          icon={<Users size={24} />}
          title="No accounts yet"
          description="Create the first staff account to start collaborating."
          action={
            <Button icon={<Plus size={16} />} onClick={openCreate}>
              Add team member
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={24} />}
          title="No users match your filters"
          description="Try a different search term or clear the role filter."
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setRoleFilter('ALL');
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
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="user-cell">
                      <span className="avatar avatar-sm">{initials(member.name)}</span>
                      <div className="table-primary">
                        <strong>{member.name}</strong>
                        <span>{member.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <RoleBadge role={member.role} />
                  </td>
                  <td>
                    <StatusBadge active={member.isActive ?? true} />
                  </td>
                  <td className="table-muted">{formatDate(member.createdAt)}</td>
                  <td>
                    {member.role === 'STAFF' && (
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => {
                            setEditingUser(member);
                            setFormOpen(true);
                          }}
                          aria-label={`Edit ${member.name}`}
                          title="Edit staff member"
                        >
                          <Pencil size={16} />
                        </button>
                        {(member.isActive ?? true) && (
                          <button
                            type="button"
                            className="icon-button icon-button-danger"
                            onClick={() => setDisableTarget(member)}
                            aria-label={`Disable ${member.name}`}
                            title="Disable staff member"
                          >
                            <UserX size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="page-footnote">
        Showing {users.length} accounts. {roleLabel('CUSTOMER')} accounts are created
        through public signup; staff and administrator accounts are created here.
      </p>

      <StaffFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        user={editingUser}
      />
      <ConfirmDialog
        open={disableTarget !== null}
        title="Disable staff account?"
        message={`${disableTarget?.name ?? 'This staff member'} will no longer be able to sign in. Their existing records will be preserved.`}
        confirmLabel="Disable account"
        loading={updatingStatus}
        onConfirm={() => void handleDisable()}
        onClose={() => {
          if (!updatingStatus) setDisableTarget(null);
        }}
      />
    </div>
  );
}
