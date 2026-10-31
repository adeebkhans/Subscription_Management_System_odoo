import { Prisma, type Plan } from '@prisma/client';
import { ApiError } from '../../core/errors/ApiError.js';
import { paginationArgs, paginationResponse } from '../../core/http/pagination.js';
import {
  closeSubscription,
  createSubscriptionWithNumber,
  findCustomer,
  findLineProducts,
  findPaymentTerm,
  findPlan,
  findQuotationTemplateWithLines,
  findSubscriptionById,
  findSubscriptions,
  findSubscriptionsDueForAutoClose,
  replaceSubscriptionLines,
  updateSubscription
} from './subscription.repository.js';
import type { PlanPolicy, SubscriptionAction, LifecycleSubject } from './lifecycle.js';
import { assertTransition, isExpired, shouldAutoClose } from './lifecycle.js';
import { summarizeLines, priceLine } from './pricing.js';
import type {
  RenewInput,
  ResolvedLine,
  SubscriptionInput,
  SubscriptionLineInput,
  SubscriptionListQuery,
  SubscriptionUpdateInput,
  TransitionInput
} from './subscription.types.js';
import {
  renewValidator,
  subscriptionLineValidator,
  subscriptionListQuerySchema,
  subscriptionUpdateValidator,
  subscriptionValidator,
  transitionValidator
} from './subscription.validators.js';

const dayMs = 24 * 60 * 60 * 1000;

function policyOf(plan: Plan): PlanPolicy {
  return {
    allowEarlyClose: plan.allowEarlyClose,
    allowPause: plan.allowPause,
    allowRenew: plan.allowRenew,
    autoClose: plan.autoClose
  };
}

function subjectOf(subscription: {
  status: LifecycleSubject['status'];
  startDate: Date;
  expiryDate: Date | null;
  quotationValidUntil: Date | null;
}): LifecycleSubject {
  return {
    status: subscription.status,
    startDate: subscription.startDate,
    expiryDate: subscription.expiryDate,
    quotationValidUntil: subscription.quotationValidUntil
  };
}

async function resolveCustomer(customerId: string) {
  const customer = await findCustomer(customerId);
  if (!customer) {
    throw new ApiError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  if (customer.role !== 'CUSTOMER') {
    throw new ApiError('Selected user is not a customer', 400, 'CUSTOMER_ROLE_REQUIRED');
  }

  if (!customer.isActive) {
    throw new ApiError('Customer account is inactive', 409, 'CUSTOMER_INACTIVE');
  }

  return customer;
}

async function resolvePaymentTerm(paymentTermId?: string) {
  if (!paymentTermId) {
    return null;
  }

  const term = await findPaymentTerm(paymentTermId);
  if (!term || !term.isActive) {
    throw new ApiError('Payment term not found or inactive', 400, 'PAYMENT_TERM_INVALID');
  }

  return term;
}

function assertPlanAvailability(plan: Plan, startDate: Date) {
  if (!plan.isActive) {
    throw new ApiError('Plan is not available', 409, 'PLAN_INACTIVE');
  }

  if (plan.availableFrom && startDate < plan.availableFrom) {
    throw new ApiError('Plan is not available before its start date', 409, 'PLAN_NOT_YET_AVAILABLE', {
      availableFrom: plan.availableFrom
    });
  }

  if (plan.availableUntil && startDate > plan.availableUntil) {
    throw new ApiError('Plan is no longer available', 409, 'PLAN_EXPIRED', {
      availableUntil: plan.availableUntil
    });
  }
}

async function resolveLines(input: SubscriptionLineInput[], plan: Plan): Promise<ResolvedLine[]> {
  const parsed = input.map((line) => subscriptionLineValidator.parse(line));
  const products = await findLineProducts([...new Set(parsed.map((line) => line.productId))]);
  const productsById = new Map(products.map((product) => [product.id, product]));

  return parsed.map((line) => {
    const product = productsById.get(line.productId);
    if (!product || !product.isActive) {
      throw new ApiError('Product not found or inactive', 400, 'PRODUCT_INVALID', {
        productId: line.productId
      });
    }

    if (line.quantity < plan.minimumQuantity) {
      throw new ApiError(
        `Minimum quantity for this plan is ${plan.minimumQuantity}`,
        400,
        'MINIMUM_QUANTITY_NOT_MET',
        { productId: line.productId, minimumQuantity: plan.minimumQuantity }
      );
    }

    let variantExtra = 0;
    if (line.variantId) {
      const variant = product.variants.find((entry) => entry.id === line.variantId);
      if (!variant || !variant.isActive) {
        throw new ApiError('Variant does not belong to the selected product', 400, 'VARIANT_INVALID', {
          productId: line.productId,
          variantId: line.variantId
        });
      }
      variantExtra = Number(variant.extraPrice);
    }

    return {
      productId: line.productId,
      variantId: line.variantId,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice ?? Number(product.salesPrice) + variantExtra,
      taxRate: line.taxRate
    };
  });
}

function buildLineRows(lines: ResolvedLine[]) {
  return lines.map((line, index) => {
    const priced = priceLine(line);
    return {
      productId: line.productId,
      ...(line.variantId ? { variantId: line.variantId } : {}),
      description: line.description,
      quantity: line.quantity,
      unitPrice: new Prisma.Decimal(line.unitPrice),
      taxRate: new Prisma.Decimal(line.taxRate),
      taxAmount: new Prisma.Decimal(priced.taxAmount),
      lineAmount: new Prisma.Decimal(priced.lineAmount),
      sortOrder: index
    };
  });
}

export async function getSubscriptions(input: unknown) {
  const query = subscriptionListQuerySchema.parse(input) as SubscriptionListQuery;
  const search = query.search?.trim();

  const where: Prisma.SubscriptionWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.planId ? { planId: query.planId } : {}),
    ...(query.startDateFrom || query.startDateTo
      ? {
          startDate: {
            ...(query.startDateFrom ? { gte: query.startDateFrom } : {}),
            ...(query.startDateTo ? { lte: query.startDateTo } : {})
          }
        }
      : {}),
    ...(search
      ? {
          OR: [
            { number: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
            { customer: { email: { contains: search, mode: 'insensitive' } } }
          ]
        }
      : {})
  };

  const { skip, take } = paginationArgs(query);
  const [items, total] = await findSubscriptions(where, skip, take);
  return paginationResponse(items, total, query);
}

export async function getSubscription(id: string) {
  const subscription = await findSubscriptionById(id);
  if (!subscription) {
    throw new ApiError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  return subscription;
}

export async function addSubscription(input: unknown, actorId: string) {
  const data = subscriptionValidator.parse(input) as SubscriptionInput;
  await resolveCustomer(data.customerId);
  const paymentTerm = await resolvePaymentTerm(data.paymentTermId);

  const template = data.quotationTemplateId
    ? await findQuotationTemplateWithLines(data.quotationTemplateId)
    : null;

  if (data.quotationTemplateId && (!template || !template.isActive)) {
    throw new ApiError('Quotation template not found or inactive', 400, 'QUOTATION_INVALID');
  }

  const planId = data.planId ?? template?.planId ?? undefined;
  if (!planId) {
    throw new ApiError('A plan is required', 400, 'PLAN_REQUIRED');
  }

  const plan = await findPlan(planId);
  if (!plan) {
    throw new ApiError('Plan not found', 404, 'PLAN_NOT_FOUND');
  }

  assertPlanAvailability(plan, data.startDate);

  const rawLines: SubscriptionLineInput[] =
    data.lines && data.lines.length > 0
      ? data.lines
      : (template?.lines ?? []).map((line) => ({
          productId: line.productId,
          variantId: line.variantId ?? undefined,
          quantity: line.quantity,
          unitPrice: line.unitPrice === null ? undefined : Number(line.unitPrice),
          taxRate: Number(line.taxRate)
        }));

  if (rawLines.length === 0) {
    throw new ApiError('At least one product line is required', 400, 'LINES_REQUIRED');
  }

  const lines = await resolveLines(rawLines, plan);
  const totals = summarizeLines(lines);
  const rows = buildLineRows(lines);
  const status = template ? 'QUOTATION' : 'DRAFT';
  const quotationValidUntil = template
    ? new Date(data.startDate.getTime() + template.validityDays * dayMs)
    : null;

  return createSubscriptionWithNumber(
    (number) => ({
      number,
      customer: { connect: { id: data.customerId } },
      plan: { connect: { id: planId } },
      status,
      startDate: data.startDate,
      expiryDate: data.expiryDate,
      quotationValidUntil,
      notes: data.notes,
      subtotal: new Prisma.Decimal(totals.subtotal),
      taxTotal: new Prisma.Decimal(totals.taxTotal),
      total: new Prisma.Decimal(totals.total),
      ...(paymentTerm ? { paymentTerm: { connect: { id: paymentTerm.id } } } : {}),
      ...(template ? { quotationTemplate: { connect: { id: template.id } } } : {}),
      createdBy: { connect: { id: actorId } },
      lines: { create: rows }
    }),
    data.startDate.getFullYear()
  );
}

export async function editSubscription(id: string, input: unknown) {
  const existing = await getSubscription(id);
  if (existing.status !== 'DRAFT' && existing.status !== 'QUOTATION') {
    throw new ApiError('Only draft or quotation subscriptions can be edited', 409, 'SUBSCRIPTION_LOCKED', {
      status: existing.status
    });
  }

  const data = subscriptionUpdateValidator.parse(input) as SubscriptionUpdateInput;
  const nextStart = data.startDate ?? existing.startDate;
  const nextExpiry = data.expiryDate === undefined ? existing.expiryDate : data.expiryDate;

  if (nextExpiry && nextExpiry < nextStart) {
    throw new ApiError('Expiry date cannot be before the start date', 400, 'INVALID_DATE_RANGE');
  }

  const updateData: Prisma.SubscriptionUpdateInput = {
    startDate: data.startDate,
    expiryDate: data.expiryDate,
    notes: data.notes
  };

  if (data.paymentTermId === null) {
    updateData.paymentTerm = { disconnect: true };
  } else if (data.paymentTermId) {
    const paymentTerm = await resolvePaymentTerm(data.paymentTermId);
    if (paymentTerm) {
      updateData.paymentTerm = { connect: { id: paymentTerm.id } };
    }
  }

  if (data.lines) {
    const plan = await findPlan(existing.planId);
    if (!plan) {
      throw new ApiError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }

    const lines = await resolveLines(data.lines, plan);
    const totals = summarizeLines(lines);
    await replaceSubscriptionLines(id, buildLineRows(lines));
    updateData.subtotal = new Prisma.Decimal(totals.subtotal);
    updateData.taxTotal = new Prisma.Decimal(totals.taxTotal);
    updateData.total = new Prisma.Decimal(totals.total);
  }

  return updateSubscription(id, updateData);
}

export async function transitionSubscription(id: string, input: unknown) {
  const { action, reason } = transitionValidator.parse(input) as TransitionInput;
  const subscription = await getSubscription(id);
  const plan = await findPlan(subscription.planId);
  if (!plan) {
    throw new ApiError('Plan not found', 404, 'PLAN_NOT_FOUND');
  }

  const nextStatus = assertTransition(
    subjectOf(subscription),
    policyOf(plan),
    action as SubscriptionAction
  );

  const now = new Date();
  const timestamps =
    action === 'PAUSE'
      ? { pausedAt: now }
      : action === 'RESUME'
        ? { pausedAt: null }
        : action === 'CLOSE'
          ? { closedAt: now }
          : {};

  return updateSubscription(id, {
    status: nextStatus,
    cancelledReason: action === 'CANCEL' ? reason ?? null : undefined,
    ...timestamps
  });
}

export async function renewSubscription(id: string, input: unknown, actorId: string) {
  const data = renewValidator.parse(input) as RenewInput;
  const source = await getSubscription(id);
  const plan = await findPlan(source.planId);
  if (!plan) {
    throw new ApiError('Plan not found', 404, 'PLAN_NOT_FOUND');
  }

  if (!plan.allowRenew) {
    throw new ApiError('This plan does not allow renewal', 409, 'RENEW_NOT_ALLOWED');
  }

  if (source.status !== 'ACTIVE' && source.status !== 'CLOSED') {
    throw new ApiError('Only active or closed subscriptions can be renewed', 409, 'RENEW_NOT_AVAILABLE', {
      status: source.status
    });
  }

  const startDate =
    data.startDate ?? (source.expiryDate ? new Date(source.expiryDate.getTime() + dayMs) : new Date());
  const lines: SubscriptionLineInput[] = source.lines.map((line) => ({
    productId: line.productId,
    variantId: line.variantId ?? undefined,
    description: line.description ?? undefined,
    quantity: line.quantity,
    unitPrice: Number(line.unitPrice),
    taxRate: Number(line.taxRate)
  }));

  const resolved = await resolveLines(lines, plan);
  const totals = summarizeLines(resolved);
  const rows = buildLineRows(resolved);

  return createSubscriptionWithNumber(
    (number) => ({
      number,
      customer: { connect: { id: source.customerId } },
      plan: { connect: { id: source.planId } },
      status: 'DRAFT',
      startDate,
      expiryDate: data.expiryDate,
      subtotal: new Prisma.Decimal(totals.subtotal),
      taxTotal: new Prisma.Decimal(totals.taxTotal),
      total: new Prisma.Decimal(totals.total),
      ...(source.paymentTermId ? { paymentTerm: { connect: { id: source.paymentTermId } } } : {}),
      renewedFrom: { connect: { id: source.id } },
      createdBy: { connect: { id: actorId } },
      lines: { create: rows }
    }),
    startDate.getFullYear()
  );
}

export async function autoCloseExpiredSubscriptions(now = new Date()) {
  const candidates = await findSubscriptionsDueForAutoClose(now);
  const closed: string[] = [];

  for (const candidate of candidates) {
    const subject = subjectOf(candidate);
    if (shouldAutoClose(subject, policyOf(candidate.plan), now) && isExpired(subject, now)) {
      await closeSubscription(candidate.id, now);
      closed.push(candidate.id);
    }
  }

  return { closedCount: closed.length, closedIds: closed };
}
