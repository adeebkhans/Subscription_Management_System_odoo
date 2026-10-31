import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Alert } from '../../components/ui/Alert';
import { Badge, ProductTypeBadge } from '../../components/ui/Badge';
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
import { formatDate, formatDateTime, formatMoney, productTypeLabel } from '../../lib/format';
import type { Product, ProductType } from '../../types';
import { ProductFormModal } from './ProductFormModal';

type TypeFilter = 'ALL' | ProductType;

export function ProductsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = user?.role === 'ADMIN';
  const [searchParams] = useSearchParams();
  const openedFromCatalog = useRef(false);

  const load = useCallback(() => api.catalog.listProducts(), []);
  const { data, loading, error, reload } = useAsync(load, [load]);
  const products = data ?? [];

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (canManage && searchParams.get('new') === '1' && !openedFromCatalog.current) {
      openedFromCatalog.current = true;
      openCreate();
    }
  }, [canManage, searchParams]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (typeFilter !== 'ALL' && product.type !== typeFilter) return false;
      if (!query) return true;
      const variantText = product.variants
        .map((variant) => `${variant.attribute} ${variant.value}`)
        .join(' ');
      return (
        product.name.toLowerCase().includes(query) ||
        (product.notes ?? '').toLowerCase().includes(query) ||
        variantText.toLowerCase().includes(query)
      );
    });
  }, [products, search, typeFilter]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
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
      await api.catalog.deleteProduct(deleteTarget.id);
      toast.success('Product removed', `${deleteTarget.name} is no longer in the catalog.`);
      setDeleteTarget(null);
      reload();
    } catch (caught) {
      toast.error('Could not remove product', describeApiError(caught));
    } finally {
      setDeleting(false);
    }
  }

  const hasProducts = products.length > 0;
  const hasFilters = search.trim().length > 0 || typeFilter !== 'ALL';

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Master data"
        title="Products"
        description="Manage products, services, pricing, and additive variant pricing."
        actions={
          canManage ? (
            <Button icon={<Plus size={16} />} onClick={openCreate}>
              New product
            </Button>
          ) : undefined
        }
      />

      <section className="toolbar-card">
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search products, notes, or variants…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search products"
          />
        </div>
        <div className="toolbar-filters">
          <select
            className="toolbar-select"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            aria-label="Filter products by type"
          >
            <option value="ALL">All types</option>
            <option value="SERVICE">Services</option>
            <option value="GOODS">Goods</option>
          </select>
          <span className="toolbar-count">
            {filtered.length} of {products.length}
          </span>
        </div>
      </section>

      {error ? (
        <Alert
          tone="error"
          title="Could not load products"
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
            <Spinner label="Loading products" />
            <span>Loading products…</span>
          </div>
        </div>
      ) : !hasProducts ? (
        <EmptyState
          icon={<Package size={24} />}
          title="No products yet"
          description={
            canManage
              ? 'Add your first product or service to start building the catalog.'
              : 'Products will appear here once an administrator adds them.'
          }
          action={
            canManage ? (
              <Button icon={<Plus size={16} />} onClick={openCreate}>
                Create product
              </Button>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={24} />}
          title="No products match your filters"
          description="Try a different search term or clear the type filter."
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('ALL');
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
                <th>Product</th>
                <th>Type</th>
                <th>Sales price</th>
                <th>Cost price</th>
                <th>Variants</th>
                <th>Created</th>
                <th className="table-actions-head">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="table-primary">
                      <strong>{product.name}</strong>
                      <span>{product.notes?.trim() || 'No notes'}</span>
                    </div>
                  </td>
                  <td>
                    <ProductTypeBadge type={product.type} />
                  </td>
                  <td className="table-money">{formatMoney(product.salesPrice)}</td>
                  <td className="table-money table-muted">{formatMoney(product.costPrice)}</td>
                  <td>
                    {product.variants.length > 0 ? (
                      <Badge tone="neutral">{product.variants.length} variants</Badge>
                    ) : (
                      <span className="table-muted">—</span>
                    )}
                  </td>
                  <td className="table-muted">{formatDate(product.createdAt)}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setDetail(product)}
                        aria-label={`View ${product.name}`}
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => openEdit(product)}
                            aria-label={`Edit ${product.name}`}
                            title="Edit product"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-button icon-button-danger"
                            onClick={() => setDeleteTarget(product)}
                            aria-label={`Delete ${product.name}`}
                            title="Delete product"
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

      <ProductFormModal
        open={formOpen}
        product={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

      <ProductDetailModal
        product={detail}
        canManage={canManage}
        onClose={() => setDetail(null)}
        onEdit={openEdit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove product?"
        message={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed from the active catalog. This cannot be undone from this screen.`
            : ''
        }
        confirmLabel="Remove product"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function ProductDetailModal({
  product,
  canManage,
  onClose,
  onEdit
}: {
  product: Product | null;
  canManage: boolean;
  onClose: () => void;
  onEdit: (product: Product) => void;
}) {
  return (
    <Modal
      open={product !== null}
      onClose={onClose}
      title={product?.name ?? 'Product'}
      description={product ? `${productTypeLabel(product.type)} · catalog item` : undefined}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {canManage && product && (
            <Button variant="primary" onClick={() => onEdit(product)}>
              Edit product
            </Button>
          )}
        </>
      }
    >
      {product && (
        <div className="detail-stack">
          <div className="detail-grid">
            <div>
              <span>Type</span>
              <strong>{productTypeLabel(product.type)}</strong>
            </div>
            <div>
              <span>Sales price</span>
              <strong>{formatMoney(product.salesPrice)}</strong>
            </div>
            <div>
              <span>Cost price</span>
              <strong>{formatMoney(product.costPrice)}</strong>
            </div>
            <div>
              <span>Created</span>
              <strong>{formatDate(product.createdAt)}</strong>
            </div>
          </div>

          <div className="detail-block">
            <h3>Notes</h3>
            <p>{product.notes?.trim() || 'No notes have been added for this product.'}</p>
          </div>

          <div className="detail-block">
            <h3>Variants</h3>
            {product.variants.length > 0 ? (
              <div className="mini-table-wrap">
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Attribute</th>
                      <th>Value</th>
                      <th>Extra price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((variant) => (
                      <tr key={`${variant.attribute}-${variant.value}`}>
                        <td>{variant.attribute}</td>
                        <td>{variant.value}</td>
                        <td>{formatMoney(variant.extraPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="detail-empty">This product uses its base price only.</p>
            )}
          </div>

          <p className="detail-timestamp">Last updated {formatDateTime(product.updatedAt)}</p>
        </div>
      )}
    </Modal>
  );
}
