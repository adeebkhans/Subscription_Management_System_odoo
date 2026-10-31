import { Prisma } from '@prisma/client';
import { ApiError } from '../../core/errors/ApiError.js';
import { paginationArgs, paginationResponse } from '../../core/http/pagination.js';
import {
  countSubscriptionsForQuotation,
  findProductsForQuotation,
  findQuotationById,
  findQuotations,
  insertQuotation,
  replaceQuotationLines,
  updateQuotation
} from './quotation.repository.js';
import type { QuotationInput, QuotationLineInput, QuotationUpdateInput } from './quotation.types.js';
import {
  quotationListQuerySchema,
  quotationUpdateValidator,
  quotationValidator
} from './quotation.validators.js';

async function toLineData(lines: QuotationLineInput[]) {
  const products = await findProductsForQuotation([...new Set(lines.map((line) => line.productId))]);
  const productsById = new Map(products.map((product) => [product.id, product]));

  return lines.map((line) => {
    const product = productsById.get(line.productId);
    if (!product) {
      throw new ApiError('Product not found for quotation line', 400, 'PRODUCT_NOT_FOUND', {
        productId: line.productId
      });
    }

    if (line.variantId) {
      const variant = product.variants.find((entry) => entry.id === line.variantId);
      if (!variant) {
        throw new ApiError('Variant does not belong to the selected product', 400, 'VARIANT_MISMATCH', {
          productId: line.productId,
          variantId: line.variantId
        });
      }
    }

    return {
      productId: line.productId,
      ...(line.variantId ? { variantId: line.variantId } : {}),
      quantity: line.quantity,
      unitPrice: line.unitPrice === undefined ? undefined : new Prisma.Decimal(line.unitPrice),
      taxRate: new Prisma.Decimal(line.taxRate),
      sortOrder: line.sortOrder
    };
  });
}

export async function getQuotations(input: unknown) {
  const query = quotationListQuerySchema.parse(input);
  const search = query.search?.trim();
  const where: Prisma.QuotationTemplateWhereInput = {
    ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {})
  };

  const { skip, take } = paginationArgs(query);
  const [items, total] = await findQuotations(where, skip, take);
  return paginationResponse(items, total, query);
}

export async function getQuotation(id: string) {
  const quotation = await findQuotationById(id);
  if (!quotation) {
    throw new ApiError('Quotation template not found', 404, 'QUOTATION_NOT_FOUND');
  }

  return quotation;
}

export async function addQuotation(input: unknown, createdById: string) {
  const data = quotationValidator.parse(input) as QuotationInput;
  const lines = await toLineData(data.lines);

  return insertQuotation({
    name: data.name,
    description: data.description,
    validityDays: data.validityDays,
    isActive: data.isActive,
    ...(data.planId ? { plan: { connect: { id: data.planId } } } : {}),
    createdBy: { connect: { id: createdById } },
    lines: { create: lines }
  });
}

export async function editQuotation(id: string, input: unknown) {
  await getQuotation(id);
  const data = quotationUpdateValidator.parse(input) as QuotationUpdateInput;

  const updated = await updateQuotation(id, {
    name: data.name,
    description: data.description,
    validityDays: data.validityDays,
    isActive: data.isActive,
    ...(data.planId === undefined
      ? {}
      : data.planId === null
        ? { plan: { disconnect: true } }
        : { plan: { connect: { id: data.planId } } })
  });

  if (data.lines) {
    await replaceQuotationLines(id, await toLineData(data.lines));
    return getQuotation(id);
  }

  return updated;
}

export async function deactivateQuotation(id: string) {
  await getQuotation(id);
  const inUse = await countSubscriptionsForQuotation(id);
  if (inUse > 0) {
    throw new ApiError(
      'Quotation template is used by open subscriptions',
      409,
      'QUOTATION_IN_USE',
      { subscriptions: inUse }
    );
  }

  await updateQuotation(id, { isActive: false });
}
