import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/FormControls';
import { formatMoney } from '../../lib/format';
import type { Product } from '../../types';

export interface LineItemValues {
  productId: string;
  variantId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}

export function emptyLineItem(): LineItemValues {
  return {
    productId: '',
    variantId: '',
    description: '',
    quantity: '1',
    unitPrice: '',
    taxRate: '0'
  };
}

export function lineItemFromProduct(product: Product): LineItemValues {
  return {
    ...emptyLineItem(),
    productId: product.id,
    unitPrice: String(product.salesPrice)
  };
}

interface LineItemsEditorProps {
  products: Product[];
  lines: LineItemValues[];
  errors: Record<string, string>;
  onChange: (index: number, field: keyof LineItemValues, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  showDescription?: boolean;
  title?: string;
  description?: string;
  emptyMessage?: string;
  addLabel?: string;
}

export function LineItemsEditor({
  products,
  lines,
  errors,
  onChange,
  onAdd,
  onRemove,
  showDescription = false,
  title = 'Product lines',
  description = 'Add the products included in this agreement.',
  emptyMessage = 'No product lines yet.',
  addLabel = 'Add line'
}: LineItemsEditorProps) {
  return (
    <section className="form-section">
      <div className="form-section-heading form-section-heading-row">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus size={15} />}
          onClick={onAdd}
          disabled={products.length === 0}
        >
          {addLabel}
        </Button>
      </div>

      {errors.lines ? <p className="field-error">{errors.lines}</p> : null}

      {lines.length === 0 ? (
        <div className="line-items-empty">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className={showDescription ? 'line-items line-items-wide' : 'line-items'}>
          <div
            className={showDescription ? 'line-row line-row-wide line-row-head' : 'line-row line-row-head'}
            aria-hidden="true"
          >
            <span>Product</span>
            <span>Variant</span>
            {showDescription && <span>Description</span>}
            <span>Qty</span>
            <span>Unit price</span>
            <span>Tax %</span>
            <span />
          </div>

          {lines.map((line, index) => {
            const product = products.find((entry) => entry.id === line.productId);
            const variants = product?.variants ?? [];
            const rowClass = showDescription ? 'line-row line-row-wide' : 'line-row';

            return (
              <div className={rowClass} key={index}>
                <Select
                  aria-label={`Line ${index + 1} product`}
                  value={line.productId}
                  onChange={(event) => onChange(index, 'productId', event.target.value)}
                  error={errors[`lines.${index}.productId`]}
                >
                  <option value="">Select product</option>
                  {products.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </Select>

                <Select
                  aria-label={`Line ${index + 1} variant`}
                  value={line.variantId}
                  onChange={(event) => onChange(index, 'variantId', event.target.value)}
                  error={errors[`lines.${index}.variantId`]}
                  disabled={variants.length === 0}
                >
                  <option value="">Base price</option>
                  {variants.map((variant) => (
                    <option key={variant.id ?? `${variant.attribute}-${variant.value}`} value={variant.id}>
                      {variant.attribute}: {variant.value}
                      {Number(variant.extraPrice) > 0 ? ` (+${formatMoney(variant.extraPrice)})` : ''}
                    </option>
                  ))}
                </Select>

                {showDescription && (
                  <Input
                    aria-label={`Line ${index + 1} description`}
                    placeholder="Optional line note"
                    value={line.description}
                    onChange={(event) => onChange(index, 'description', event.target.value)}
                    error={errors[`lines.${index}.description`]}
                  />
                )}

                <Input
                  aria-label={`Line ${index + 1} quantity`}
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={line.quantity}
                  onChange={(event) => onChange(index, 'quantity', event.target.value)}
                  error={errors[`lines.${index}.quantity`]}
                />

                <Input
                  aria-label={`Line ${index + 1} unit price`}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder={product ? String(product.salesPrice) : '0.00'}
                  value={line.unitPrice}
                  onChange={(event) => onChange(index, 'unitPrice', event.target.value)}
                  error={errors[`lines.${index}.unitPrice`]}
                />

                <Input
                  aria-label={`Line ${index + 1} tax rate`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  inputMode="decimal"
                  value={line.taxRate}
                  onChange={(event) => onChange(index, 'taxRate', event.target.value)}
                  error={errors[`lines.${index}.taxRate`]}
                />

                <button
                  type="button"
                  className="icon-button icon-button-danger"
                  onClick={() => onRemove(index)}
                  aria-label={`Remove line ${index + 1}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
