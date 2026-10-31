import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Compass, Layers, Package, Search } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Alert } from '../../components/ui/Alert';
import {
  Badge,
  FrequencyBadge,
  ProductTypeBadge
} from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../lib/api';
import { describeApiError } from '../../lib/errors';
import {
  availabilityLabel,
  formatMoney,
  frequencySuffix,
  productTypeLabel
} from '../../lib/format';
import type { Plan, Product } from '../../types';

type CatalogTab = 'plans' | 'products';

interface CatalogData {
  products: Product[];
  plans: Plan[];
}

export function CatalogPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const tab: CatalogTab = requestedTab === 'products' ? 'products' : 'plans';
  const [search, setSearch] = useState('');

  const load = useCallback(async (): Promise<CatalogData> => {
    const [products, plans] = await Promise.all([
      api.catalog.listProducts(),
      api.catalog.listPlans()
    ]);
    return { products, plans };
  }, []);

  const { data, loading, error, reload } = useAsync(load, [load]);

  const query = search.trim().toLowerCase();

  const filteredPlans = useMemo(() => {
    if (!data) return [];
    return data.plans.filter((plan) => {
      if (!query) return true;
      return (
        plan.name.toLowerCase().includes(query) ||
        plan.frequency.toLowerCase().includes(query)
      );
    });
  }, [data, query]);

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    return data.products.filter((product) => {
      if (!query) return true;
      return (
        product.name.toLowerCase().includes(query) ||
        product.type.toLowerCase().includes(query) ||
        (product.notes ?? '').toLowerCase().includes(query)
      );
    });
  }, [data, query]);

  function selectTab(nextTab: CatalogTab) {
    setSearchParams(nextTab === 'plans' ? {} : { tab: nextTab });
  }

  const activeCount = tab === 'plans' ? filteredPlans.length : filteredProducts.length;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Public catalog"
        title={user?.role === 'CUSTOMER' ? 'Explore what is available' : 'Catalog preview'}
        description={
          user?.role === 'CUSTOMER'
            ? 'Browse products and plans before starting a subscription.'
            : 'See the customer-facing catalog exactly as it appears in the storefront.'
        }
        actions={
          <Link to="/app" className="button button-secondary">
            <Compass size={16} />
            <span>Back to dashboard</span>
          </Link>
        }
      />

      <section className="catalog-toolbar">
        <div className="tabs" role="tablist" aria-label="Catalog sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'plans'}
            className={tab === 'plans' ? 'tab is-active' : 'tab'}
            onClick={() => selectTab('plans')}
          >
            <Layers size={16} />
            Plans
            <span className="tab-count">{data?.plans.length ?? 0}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'products'}
            className={tab === 'products' ? 'tab is-active' : 'tab'}
            onClick={() => selectTab('products')}
          >
            <Package size={16} />
            Products
            <span className="tab-count">{data?.products.length ?? 0}</span>
          </button>
        </div>

        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder={tab === 'plans' ? 'Search plans…' : 'Search products…'}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={tab === 'plans' ? 'Search plans' : 'Search products'}
          />
        </div>
      </section>

      {error ? (
        <Alert
          tone="error"
          title="Could not load the catalog"
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
        <div className="catalog-grid" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="skeleton-card skeleton-catalog" />
          ))}
          <div className="loading-note">
            <Spinner label="Loading catalog" />
            <span>Loading catalog…</span>
          </div>
        </div>
      ) : activeCount === 0 ? (
        <EmptyState
          icon={tab === 'plans' ? <Layers size={22} /> : <Package size={22} />}
          title={query ? `No ${tab} match “${search}”` : `No ${tab} available yet`}
          description={
            query
              ? 'Try a different search term or switch to the other catalog section.'
              : 'New catalog items will appear here as soon as they are published.'
          }
        />
      ) : tab === 'plans' ? (
        <div className="catalog-grid">
          {filteredPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      ) : (
        <div className="catalog-grid">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {user?.role === 'CUSTOMER' && (
        <div className="catalog-note">
          <span className="catalog-note-icon">
            <Compass size={18} />
          </span>
          <div>
            <strong>Subscriptions arrive in Phase 2</strong>
            <p>
              You will be able to start, pause, renew, and track subscriptions directly
              from this portal.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article className="catalog-card">
      <div className="catalog-card-head">
        <FrequencyBadge frequency={plan.frequency} />
        <span className="catalog-price">
          {formatMoney(plan.price)}
          <small>{frequencySuffix(plan.frequency)}</small>
        </span>
      </div>
      <h3>{plan.name}</h3>
      <p className="catalog-card-copy">
        Minimum quantity of {plan.minimumQuantity} per subscription.
      </p>
      <dl className="catalog-facts">
        <div>
          <dt>Availability</dt>
          <dd>{availabilityLabel(plan.availableFrom, plan.availableUntil)}</dd>
        </div>
        <div>
          <dt>Policies</dt>
          <dd className="chip-row">
            {plan.autoClose && <Badge tone="warning">Auto close</Badge>}
            {plan.allowEarlyClose && <Badge tone="neutral">Early close</Badge>}
            {plan.allowPause && <Badge tone="info">Pause</Badge>}
            {plan.allowRenew && <Badge tone="success">Renew</Badge>}
            {!plan.autoClose &&
              !plan.allowEarlyClose &&
              !plan.allowPause &&
              !plan.allowRenew && <Badge tone="neutral">Standard</Badge>}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="catalog-card">
      <div className="catalog-card-head">
        <ProductTypeBadge type={product.type} />
        <span className="catalog-price">{formatMoney(product.salesPrice)}</span>
      </div>
      <h3>{product.name}</h3>
      <p className="catalog-card-copy">
        {product.notes?.trim() ? product.notes : `A ${productTypeLabel(product.type).toLowerCase()} item in the catalog.`}
      </p>
      {product.variants.length > 0 && (
        <div className="variant-preview">
          <span className="variant-preview-label">Variants</span>
          <div className="chip-row">
            {product.variants.slice(0, 4).map((variant) => (
              <Badge key={`${variant.attribute}-${variant.value}`} tone="neutral">
                {variant.attribute}: {variant.value}
                {Number(variant.extraPrice) > 0 && ` +${formatMoney(variant.extraPrice)}`}
              </Badge>
            ))}
            {product.variants.length > 4 && (
              <Badge tone="neutral">+{product.variants.length - 4} more</Badge>
            )}
          </div>
        </div>
      )}
      <div className="catalog-card-foot">
        <span>{product.variants.length} variants</span>
        <span>Cost {formatMoney(product.costPrice)}</span>
      </div>
    </article>
  );
}
