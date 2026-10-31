import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarClock,
  Compass,
  Layers,
  Package,
  Plus,
  Sparkles,
  Users
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Badge, FrequencyBadge, ProductTypeBadge, RoleBadge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/ui/StatCard';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../lib/api';
import { describeApiError } from '../../lib/errors';
import {
  formatDate,
  formatMoney,
  frequencyLabel,
  frequencySuffix,
  getGreeting
} from '../../lib/format';
import type { Plan, Product, User } from '../../types';

interface DashboardData {
  products: Product[];
  plans: Plan[];
  users: User[];
}

export function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'CUSTOMER';
  const isAdmin = role === 'ADMIN';
  const isCustomer = role === 'CUSTOMER';

  const load = useCallback(async (): Promise<DashboardData> => {
    const [products, plans, users] = await Promise.all([
      api.catalog.listProducts(),
      api.catalog.listPlans(),
      isAdmin ? api.users.list() : Promise.resolve([] as User[])
    ]);
    return { products, plans, users };
  }, [isAdmin]);

  const { data, loading, error, reload } = useAsync(load, [load]);

  const teamCount = data?.users.filter((member) => member.role !== 'CUSTOMER').length ?? 0;
  const customerCount = data?.users.filter((member) => member.role === 'CUSTOMER').length ?? 0;
  const productCount = data?.products.length ?? 0;
  const planCount = data?.plans.length ?? 0;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={`${getGreeting()}, ${user?.name.split(' ')[0] ?? 'there'}`}
        title={isCustomer ? 'Your subscription home' : 'Workspace overview'}
        description={
          isCustomer
            ? 'Explore the catalog today. Your subscriptions and invoices will live here in the next phase.'
            : 'A quick read on the foundation: people, products, and the plans that connect them.'
        }
        actions={
          isCustomer ? (
            <Link to="/app/catalog" className="button button-primary">
              <Compass size={16} />
              <span>Browse catalog</span>
            </Link>
          ) : isAdmin ? (
            <Link to="/app/plans" className="button button-primary">
              <Plus size={16} />
              <span>New plan</span>
            </Link>
          ) : (
            <Link to="/app/plans" className="button button-primary">
              <Layers size={16} />
              <span>Review plans</span>
            </Link>
          )
        }
      />

      {error ? (
        <Alert
          tone="error"
          title="Could not load the workspace"
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
        <DashboardSkeleton />
      ) : (
        <>
          <section className="stats-grid" aria-label="Workspace summary">
            {isAdmin && (
              <>
                <StatCard
                  label="Team members"
                  value={teamCount}
                  hint="Admins & staff"
                  icon={<Users size={20} />}
                  tone="primary"
                />
                <StatCard
                  label="Customers"
                  value={customerCount}
                  hint="Self-service accounts"
                  icon={<Sparkles size={20} />}
                  tone="info"
                />
              </>
            )}
            <StatCard
              label="Products"
              value={productCount}
              hint="Active catalog items"
              icon={<Package size={20} />}
              tone="success"
            />
            <StatCard
              label="Plans"
              value={planCount}
              hint="Available to sell"
              icon={<Layers size={20} />}
              tone="warning"
            />
            {isCustomer && (
              <StatCard
                label="Subscriptions"
                value="0"
                hint="Phase 2"
                icon={<CalendarClock size={20} />}
                tone="primary"
              />
            )}
          </section>

          {isCustomer ? (
            <CustomerOverview
              products={data?.products ?? []}
              plans={data?.plans ?? []}
            />
          ) : (
            <div className="dashboard-columns">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Quick actions</h2>
                    <p>Jump straight into the work that moves the catalog forward.</p>
                  </div>
                </div>
                <div className="quick-actions">
                  {isAdmin && (
                    <Link to="/app/users" className="quick-action">
                      <span className="quick-action-icon quick-action-violet">
                        <Users size={18} />
                      </span>
                      <span>
                        <strong>Add a team member</strong>
                        <small>Create staff or admin access</small>
                      </span>
                      <ArrowUpRight size={16} />
                    </Link>
                  )}
                  <Link to="/app/plans" className="quick-action">
                    <span className="quick-action-icon quick-action-teal">
                      <Layers size={18} />
                    </span>
                    <span>
                      <strong>{isAdmin ? 'Create a plan' : 'Review plans'}</strong>
                      <small>
                        {isAdmin
                          ? 'Set pricing, frequency, and policies'
                          : 'See pricing, frequency, and policies'}
                      </small>
                    </span>
                    <ArrowUpRight size={16} />
                  </Link>
                  <Link to="/app/products" className="quick-action">
                    <span className="quick-action-icon quick-action-amber">
                      <Package size={18} />
                    </span>
                    <span>
                      <strong>Review products</strong>
                      <small>Prices, variants, and notes</small>
                    </span>
                    <ArrowUpRight size={16} />
                  </Link>
                  <Link to="/app/catalog" className="quick-action">
                    <span className="quick-action-icon quick-action-blue">
                      <Compass size={18} />
                    </span>
                    <span>
                      <strong>Open the catalog</strong>
                      <small>See what customers see</small>
                    </span>
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Latest plans</h2>
                    <p>The most recently created plans in the catalog.</p>
                  </div>
                  <Link to="/app/plans" className="text-link">
                    View all
                  </Link>
                </div>
                {data && data.plans.length > 0 ? (
                  <ul className="summary-list">
                    {data.plans.slice(0, 4).map((plan) => (
                      <li key={plan.id}>
                        <div className="summary-list-main">
                          <span className="summary-avatar summary-avatar-teal">
                            <Layers size={16} />
                          </span>
                          <div>
                            <strong>{plan.name}</strong>
                            <span>{formatDate(plan.createdAt)}</span>
                          </div>
                        </div>
                        <div className="summary-list-meta">
                          <FrequencyBadge frequency={plan.frequency} />
                          <strong>
                            {formatMoney(plan.price)}
                            <small>{frequencySuffix(plan.frequency)}</small>
                          </strong>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    compact
                    icon={<Layers size={20} />}
                    title="No plans yet"
                    description="Create the first plan to start shaping your catalog."
                    action={
                      <Link to="/app/plans" className="button button-secondary button-sm">
                        <span>Create plan</span>
                      </Link>
                    }
                  />
                )}
              </section>

              {isAdmin && (
                <section className="panel dashboard-span-2">
                  <div className="panel-header">
                    <div>
                      <h2>Recent people</h2>
                      <p>Staff and customer accounts created most recently.</p>
                    </div>
                    <Link to="/app/users" className="text-link">
                      View all
                    </Link>
                  </div>
                  {data && data.users.length > 0 ? (
                    <ul className="summary-list">
                      {data.users.slice(0, 5).map((member) => (
                        <li key={member.id}>
                          <div className="summary-list-main">
                            <span className="summary-avatar summary-avatar-violet">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <strong>{member.name}</strong>
                              <span>{member.email}</span>
                            </div>
                          </div>
                          <div className="summary-list-meta">
                            <RoleBadge role={member.role} />
                            <span className="summary-date">{formatDate(member.createdAt)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState
                      compact
                      icon={<Users size={20} />}
                      title="No users yet"
                      description="Invite your first staff member to collaborate."
                    />
                  )}
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CustomerOverview({ products, plans }: { products: Product[]; plans: Plan[] }) {
  return (
    <div className="dashboard-columns">
      <section className="panel dashboard-span-2">
        <div className="panel-header">
          <div>
            <h2>Featured plans</h2>
            <p>A preview of what is currently available.</p>
          </div>
          <Link to="/app/catalog?tab=plans" className="text-link">
            Explore plans
          </Link>
        </div>
        {plans.length > 0 ? (
          <div className="mini-card-grid">
            {plans.slice(0, 3).map((plan) => (
              <article key={plan.id} className="mini-card">
                <div className="mini-card-top">
                  <FrequencyBadge frequency={plan.frequency} />
                  <span className="mini-card-price">
                    {formatMoney(plan.price)}
                    <small>{frequencySuffix(plan.frequency)}</small>
                  </span>
                </div>
                <h3>{plan.name}</h3>
                <p>Minimum quantity {plan.minimumQuantity}</p>
                <div className="mini-card-tags">
                  {plan.allowPause && <Badge tone="info">Pause</Badge>}
                  {plan.allowRenew && <Badge tone="success">Renew</Badge>}
                  {plan.allowEarlyClose && <Badge tone="neutral">Early close</Badge>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            compact
            icon={<Layers size={20} />}
            title="Plans are being prepared"
            description="Check back soon for available subscription plans."
          />
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Catalog snapshot</h2>
            <p>Products currently offered.</p>
          </div>
          <Link to="/app/catalog?tab=products" className="text-link">
            Browse
          </Link>
        </div>
        {products.length > 0 ? (
          <ul className="summary-list">
            {products.slice(0, 4).map((product) => (
              <li key={product.id}>
                <div className="summary-list-main">
                  <span className="summary-avatar summary-avatar-amber">
                    <Package size={16} />
                  </span>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.variants.length} variants</span>
                  </div>
                </div>
                <div className="summary-list-meta">
                  <ProductTypeBadge type={product.type} />
                  <strong>{formatMoney(product.salesPrice)}</strong>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            icon={<Package size={20} />}
            title="No products yet"
            description="The catalog will appear here once products are added."
          />
        )}
      </section>

      <section className="panel dashboard-span-2 customer-callout">
        <div>
          <p className="page-eyebrow">Coming in Phase 2</p>
          <h2>Your subscriptions, invoices, and payments</h2>
          <p>
            This portal is ready for the next step. Soon you will be able to start a
            subscription, pause or renew it, and track every invoice from here.
          </p>
        </div>
        <div className="customer-callout-art" aria-hidden="true">
          <CalendarClock size={44} />
          <span>{frequencyLabel('MONTHLY')}</span>
        </div>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-hidden="true">
      <div className="stats-grid">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="skeleton-card" />
        ))}
      </div>
      <div className="dashboard-columns">
        <div className="skeleton-panel" />
        <div className="skeleton-panel" />
      </div>
      <div className="loading-note">
        <Spinner label="Loading workspace" />
        <span>Loading workspace…</span>
      </div>
    </div>
  );
}
