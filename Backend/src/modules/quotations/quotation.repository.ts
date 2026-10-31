import type { Prisma } from '@prisma/client';
import { database } from '../../core/database/prisma.js';

export const quotationInclude = {
  plan: true,
  lines: {
    include: { product: true, variant: true },
    orderBy: { sortOrder: 'asc' as const }
  }
} satisfies Prisma.QuotationTemplateInclude;

export type QuotationWithLines = Prisma.QuotationTemplateGetPayload<{ include: typeof quotationInclude }>;

export function findQuotations(where: Prisma.QuotationTemplateWhereInput, skip: number, take: number) {
  return database.$transaction([
    database.quotationTemplate.findMany({
      where,
      include: quotationInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    database.quotationTemplate.count({ where })
  ]);
}

export function findQuotationById(id: string) {
  return database.quotationTemplate.findUnique({ where: { id }, include: quotationInclude });
}

export function insertQuotation(data: Prisma.QuotationTemplateCreateInput) {
  return database.quotationTemplate.create({ data, include: quotationInclude });
}

export function updateQuotation(id: string, data: Prisma.QuotationTemplateUpdateInput) {
  return database.quotationTemplate.update({ where: { id }, data, include: quotationInclude });
}

export function replaceQuotationLines(
  templateId: string,
  lines: Array<Omit<Prisma.QuotationTemplateLineCreateManyInput, 'templateId'>>
) {
  return database.$transaction(async (tx) => {
    await tx.quotationTemplateLine.deleteMany({ where: { templateId } });
    if (lines.length > 0) {
      await tx.quotationTemplateLine.createMany({
        data: lines.map((line) => ({ ...line, templateId }))
      });
    }
  });
}

export function countSubscriptionsForQuotation(id: string) {
  return database.subscription.count({
    where: { quotationTemplateId: id, status: { in: ['QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED'] } }
  });
}

export function findProductsForQuotation(productIds: string[]) {
  return database.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true }
  });
}
