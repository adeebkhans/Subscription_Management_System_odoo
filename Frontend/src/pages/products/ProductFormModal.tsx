import { useEffect } from 'react';
import type { FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { useFormState } from '../../hooks/useFormState';
import { api } from '../../lib/api';
import { apiFieldErrors, describeApiError, zodFieldErrors } from '../../lib/errors';
import { productFormSchema } from '../../lib/validation';
import type { Product, ProductInput, ProductType } from '../../types';

interface VariantRow {
  attribute: string;
  value: string;
  extraPrice: string;
}

interface ProductFormValues {
  name: string;
  type: ProductType;
  salesPrice: string;
  costPrice: string;
  notes: string;
  variants: VariantRow[];
}

function toFormValues(product?: Product | null): ProductFormValues {
  return {
    name: product?.name ?? '',
    type: product?.type ?? 'SERVICE',
    salesPrice: product ? String(product.salesPrice) : '',
    costPrice: product ? String(product.costPrice) : '',
    notes: product?.notes ?? '',
    variants:
      product?.variants.map((variant) => ({
        attribute: variant.attribute,
        value: variant.value,
        extraPrice: String(variant.extraPrice)
      })) ?? []
  };
}

interface ProductFormModalProps {
  open: boolean;
  product?: Product | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function ProductFormModal({ open, product, onClose, onSaved }: ProductFormModalProps) {
  const {
    values,
    setValues,
    errors,
    setErrors,
    formError,
    setFormError,
    submitting,
    setSubmitting,
    setValue,
    reset
  } = useFormState<ProductFormValues>(toFormValues(product));

  useEffect(() => {
    if (open) {
      reset(toFormValues(product));
    }
  }, [open, product, reset]);

  function updateVariant(index: number, field: keyof VariantRow, value: string) {
    setValues((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant
      )
    }));
    setErrors((current) => {
      const key = `variants.${index}.${field}`;
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function addVariant() {
    setValues((current) => ({
      ...current,
      variants: [...current.variants, { attribute: '', value: '', extraPrice: '' }]
    }));
  }

  function removeVariant(index: number) {
    setValues((current) => ({
      ...current,
      variants: current.variants.filter((_, variantIndex) => variantIndex !== index)
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = productFormSchema.safeParse(values);
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      setFormError('Review the highlighted fields and try again.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload: ProductInput = {
      name: result.data.name,
      type: result.data.type,
      salesPrice: result.data.salesPrice,
      costPrice: result.data.costPrice,
      notes: product
        ? result.data.notes?.trim()
          ? result.data.notes.trim()
          : null
        : result.data.notes?.trim() || undefined,
      variants: result.data.variants.map((variant) => ({
        attribute: variant.attribute,
        value: variant.value,
        extraPrice: variant.extraPrice
      }))
    };

    try {
      if (product) {
        await api.catalog.updateProduct(product.id, payload);
        onSaved('Product updated');
      } else {
        await api.catalog.createProduct(payload);
        onSaved('Product created');
      }
      onClose();
    } catch (caught) {
      setErrors(apiFieldErrors(caught));
      setFormError(describeApiError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Edit product' : 'New product'}
      description={
        product
          ? 'Update pricing, details, or variant pricing for this catalog item.'
          : 'Add a product or service to the catalog, with optional variant pricing.'
      }
      size="lg"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" loading={submitting}>
            {product ? 'Save changes' : 'Create product'}
          </Button>
        </>
      }
    >
      <form id="product-form" className="form-stack" onSubmit={handleSubmit} noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}

        <section className="form-section">
          <div className="form-section-heading">
            <h3>Basics</h3>
            <p>The name and type customers will see in the catalog.</p>
          </div>
          <div className="form-grid">
            <Input
              label="Product name"
              name="name"
              placeholder="Business Suite"
              value={values.name}
              onChange={(event) => setValue('name', event.target.value)}
              error={errors.name}
              data-autofocus
              required
            />
            <Select
              label="Type"
              name="type"
              value={values.type}
              onChange={(event) => setValue('type', event.target.value as ProductType)}
              error={errors.type}
              required
            >
              <option value="SERVICE">Service</option>
              <option value="GOODS">Goods</option>
            </Select>
          </div>
          <Textarea
            label="Notes"
            name="notes"
            placeholder="Optional details, inclusions, or internal notes…"
            rows={3}
            value={values.notes}
            onChange={(event) => setValue('notes', event.target.value)}
            error={errors.notes}
            hint="Up to 5,000 characters."
          />
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <h3>Pricing</h3>
            <p>Base prices before any variant adjustments.</p>
          </div>
          <div className="form-grid">
            <Input
              label="Sales price"
              name="salesPrice"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="1500.00"
              value={values.salesPrice}
              onChange={(event) => setValue('salesPrice', event.target.value)}
              error={errors.salesPrice}
              required
            />
            <Input
              label="Cost price"
              name="costPrice"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="400.00"
              value={values.costPrice}
              onChange={(event) => setValue('costPrice', event.target.value)}
              error={errors.costPrice}
              required
            />
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading form-section-heading-row">
            <div>
              <h3>Variants</h3>
              <p>Additive pricing, for example a brand option with an extra fee.</p>
            </div>
            <Button variant="secondary" size="sm" icon={<Plus size={15} />} onClick={addVariant}>
              Add variant
            </Button>
          </div>

          {values.variants.length === 0 ? (
            <div className="variant-empty">
              <p>No variants yet. The base product price will be used.</p>
            </div>
          ) : (
            <div className="variant-rows">
              <div className="variant-row variant-row-head" aria-hidden="true">
                <span>Attribute</span>
                <span>Value</span>
                <span>Extra price</span>
                <span />
              </div>
              {values.variants.map((variant, index) => (
                <div className="variant-row" key={index}>
                  <Input
                    aria-label={`Variant ${index + 1} attribute`}
                    placeholder="Brand"
                    value={variant.attribute}
                    onChange={(event) => updateVariant(index, 'attribute', event.target.value)}
                    error={errors[`variants.${index}.attribute`]}
                  />
                  <Input
                    aria-label={`Variant ${index + 1} value`}
                    placeholder="Odoo"
                    value={variant.value}
                    onChange={(event) => updateVariant(index, 'value', event.target.value)}
                    error={errors[`variants.${index}.value`]}
                  />
                  <Input
                    aria-label={`Variant ${index + 1} extra price`}
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={variant.extraPrice}
                    onChange={(event) => updateVariant(index, 'extraPrice', event.target.value)}
                    error={errors[`variants.${index}.extraPrice`]}
                  />
                  <button
                    type="button"
                    className="icon-button icon-button-danger"
                    onClick={() => removeVariant(index)}
                    aria-label={`Remove variant ${index + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </form>
    </Modal>
  );
}
