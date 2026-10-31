import type { Prisma } from '@prisma/client';
import { ApiError } from '../../core/errors/ApiError.js';
import { paginationArgs, paginationResponse } from '../../core/http/pagination.js';
import {
  countSubscriptionsUsingPaymentTerm,
  findPaymentTermById,
  findPaymentTerms,
  insertPaymentTerm,
  updatePaymentTerm
} from './payment-term.repository.js';
import type { PaymentTermInput, PaymentTermUpdateInput } from './payment-term.types.js';
import {
  paymentTermListQuerySchema,
  paymentTermUpdateValidator,
  paymentTermValidator
} from './payment-term.validators.js';

export async function getPaymentTerms(input: unknown) {
  const query = paymentTermListQuerySchema.parse(input);
  const search = query.search?.trim();
  const where: Prisma.PaymentTermWhereInput = {
    ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {})
  };

  const { skip, take } = paginationArgs(query);
  const [items, total] = await findPaymentTerms(where, skip, take);
  return paginationResponse(items, total, query);
}

export async function getPaymentTerm(id: string) {
  const term = await findPaymentTermById(id);
  if (!term) {
    throw new ApiError('Payment term not found', 404, 'PAYMENT_TERM_NOT_FOUND');
  }

  return term;
}

export async function addPaymentTerm(input: unknown) {
  const data = paymentTermValidator.parse(input) as PaymentTermInput;
  return insertPaymentTerm(data);
}

export async function editPaymentTerm(id: string, input: unknown) {
  await getPaymentTerm(id);
  const data = paymentTermUpdateValidator.parse(input) as PaymentTermUpdateInput;
  return updatePaymentTerm(id, data);
}

export async function deactivatePaymentTerm(id: string) {
  await getPaymentTerm(id);
  const subscriptions = await countSubscriptionsUsingPaymentTerm(id);
  if (subscriptions > 0) {
    throw new ApiError(
      'Payment term is used by subscriptions that are still in progress',
      409,
      'PAYMENT_TERM_IN_USE',
      { subscriptions }
    );
  }

  await updatePaymentTerm(id, { isActive: false });
}
