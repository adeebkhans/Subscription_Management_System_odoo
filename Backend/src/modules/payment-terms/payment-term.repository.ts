import type { Prisma } from '@prisma/client';
import { database } from '../../core/database/prisma.js';

export function findPaymentTerms(where: Prisma.PaymentTermWhereInput, skip: number, take: number) {
  return database.$transaction([
    database.paymentTerm.findMany({ where, orderBy: { dueDays: 'asc' }, skip, take }),
    database.paymentTerm.count({ where })
  ]);
}

export function findPaymentTermById(id: string) {
  return database.paymentTerm.findUnique({ where: { id } });
}

export function insertPaymentTerm(data: Prisma.PaymentTermCreateInput) {
  return database.paymentTerm.create({ data });
}

export function updatePaymentTerm(id: string, data: Prisma.PaymentTermUpdateInput) {
  return database.paymentTerm.update({ where: { id }, data });
}

export function countSubscriptionsUsingPaymentTerm(id: string) {
  return database.subscription.count({
    where: { paymentTermId: id, status: { in: ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED'] } }
  });
}
