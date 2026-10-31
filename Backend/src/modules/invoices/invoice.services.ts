import { Prisma, type BillingFrequency } from '@prisma/client';
import { ApiError } from '../../core/errors/ApiError.js';
import { paginationArgs, paginationResponse } from '../../core/http/pagination.js';
import { priceLine, roundCurrency, summarizeLines } from '../subscriptions/pricing.js';
import {
  createInvoiceWithNumber,
  findBillableSubscription,
  findBillableSubscriptions,
  findInvoiceByBillingKey,
  findInvoiceById,
  findInvoices,
  recordPayment,
  updateInvoice,
  type BillableSubscription,
  type InvoiceWithRelations
} from './invoice.repository.js';
import type {
  GenerateInvoiceInput,
  InvoiceActionInput,
  InvoiceListQuery,
  PaymentInput
} from './invoice.types.js';
import {
  generateInvoiceValidator,
  invoiceActionValidator,
  invoiceListQuerySchema,
  billingRunValidator,
  paymentValidator
} from './invoice.validators.js';

const dayMs = 24 * 60 * 60 * 1000;

function addFrequency(date: Date, frequency: BillingFrequency) {
  const next = new Date(date);
  if (frequency === 'DAILY') next.setUTCDate(next.getUTCDate() + 1);
  if (frequency === 'WEEKLY') next.setUTCDate(next.getUTCDate() + 7);
  if (frequency === 'MONTHLY' || frequency === 'YEARLY') {
    const originalDay = next.getUTCDate();
    next.setUTCDate(1);
    if (frequency === 'MONTHLY') next.setUTCMonth(next.getUTCMonth() + 1);
    if (frequency === 'YEARLY') next.setUTCFullYear(next.getUTCFullYear() + 1);
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(originalDay, lastDay));
  }
  return next;
}

export function invoicePeriod(
  periodStart: Date,
  frequency: BillingFrequency,
  periodEnd?: Date
) {
  const calculatedEnd = new Date(addFrequency(periodStart, frequency).getTime() - 1);
  const end = periodEnd ?? calculatedEnd;
  if (end <= periodStart) {
    throw new ApiError('Invoice period end must be after period start', 400, 'INVALID_BILLING_PERIOD');
  }
  return { periodStart, periodEnd: end };
}

function billingKey(subscriptionId: string, periodStart: Date, periodEnd: Date) {
  return `${subscriptionId}:${periodStart.toISOString()}:${periodEnd.toISOString()}`;
}

function invoiceView(invoice: InvoiceWithRelations) {
  const balanceDue = roundCurrency(Math.max(0, Number(invoice.total) - Number(invoice.amountPaid)));
  return { ...invoice, balanceDue };
}

function invoiceLineRows(subscription: BillableSubscription) {
  return subscription.lines.map((line, index) => {
    const priced = priceLine({
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
      taxRate: Number(line.taxRate)
    });
    const variantText = line.variant ? ` (${line.variant.attribute}: ${line.variant.value})` : '';
    return {
      product: line.productId ? { connect: { id: line.productId } } : undefined,
      variant: line.variantId ? { connect: { id: line.variantId } } : undefined,
      description: `${line.description ?? line.product.name}${variantText}`,
      quantity: line.quantity,
      unitPrice: new Prisma.Decimal(Number(line.unitPrice)),
      taxRate: new Prisma.Decimal(Number(line.taxRate)),
      taxAmount: new Prisma.Decimal(priced.taxAmount),
      lineAmount: new Prisma.Decimal(priced.lineAmount),
      sortOrder: index
    };
  });
}

async function createInvoiceForSubscription(
  subscription: BillableSubscription,
  data: GenerateInvoiceInput,
  actorId: string,
  asOf = new Date()
) {
  const start = data.periodStart ?? subscription.startDate;
  if (start < subscription.startDate) {
    throw new ApiError('Invoice period cannot begin before the subscription', 400, 'INVALID_BILLING_PERIOD');
  }

  const calculated = invoicePeriod(start, subscription.plan.frequency, data.periodEnd);
  const end =
    subscription.expiryDate && calculated.periodEnd > subscription.expiryDate
      ? subscription.expiryDate
      : calculated.periodEnd;
  const period = invoicePeriod(start, subscription.plan.frequency, end);
  const key = billingKey(subscription.id, period.periodStart, period.periodEnd);
  const existing = await findInvoiceByBillingKey(key);
  if (existing) {
    return { invoice: invoiceView(existing), created: false };
  }

  const issueDate = data.issueDate ?? asOf;
  const dueDate = new Date(issueDate.getTime() + (subscription.paymentTerm?.dueDays ?? 0) * dayMs);
  const lineRows = invoiceLineRows(subscription);
  const totals = summarizeLines(
    subscription.lines.map((line) => ({
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
      taxRate: Number(line.taxRate)
    }))
  );

  try {
    const invoice = await createInvoiceWithNumber(
      (number) => ({
        number,
        billingKey: key,
        subscription: { connect: { id: subscription.id } },
        customer: { connect: { id: subscription.customerId } },
        customerName: subscription.customer.name,
        customerEmail: subscription.customer.email,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        issueDate,
        dueDate,
        subtotal: new Prisma.Decimal(totals.subtotal),
        taxTotal: new Prisma.Decimal(totals.taxTotal),
        total: new Prisma.Decimal(totals.total),
        createdBy: { connect: { id: actorId } },
        lines: { create: lineRows }
      }),
      issueDate.getUTCFullYear()
    );
    return { invoice: invoiceView(invoice), created: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const concurrent = await findInvoiceByBillingKey(key);
      if (concurrent) {
        return { invoice: invoiceView(concurrent), created: false };
      }
    }
    throw error;
  }
}

export async function getInvoices(input: unknown) {
  const query = invoiceListQuerySchema.parse(input) as InvoiceListQuery;
  const search = query.search?.trim();
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.subscriptionId ? { subscriptionId: query.subscriptionId } : {}),
    ...(query.dueDateFrom || query.dueDateTo
      ? {
          dueDate: {
            ...(query.dueDateFrom ? { gte: query.dueDateFrom } : {}),
            ...(query.dueDateTo ? { lte: query.dueDateTo } : {})
          }
        }
      : {}),
    ...(search
      ? {
          OR: [
            { number: { contains: search, mode: 'insensitive' as const } },
            { customerName: { contains: search, mode: 'insensitive' as const } },
            { customerEmail: { contains: search, mode: 'insensitive' as const } }
          ]
        }
      : {})
  };

  const { skip, take } = paginationArgs(query);
  const [items, total] = await findInvoices(where, skip, take);
  return paginationResponse(items.map(invoiceView), total, query);
}

export async function getInvoice(id: string) {
  const invoice = await findInvoiceById(id);
  if (!invoice) {
    throw new ApiError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }
  return invoiceView(invoice);
}

export async function generateInvoice(input: unknown, actorId: string) {
  const data = generateInvoiceValidator.parse(input) as GenerateInvoiceInput;
  const subscription = await findBillableSubscription(data.subscriptionId);
  if (!subscription) {
    throw new ApiError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
  }
  if (subscription.status !== 'ACTIVE') {
    throw new ApiError('Only active subscriptions can be billed', 409, 'SUBSCRIPTION_NOT_BILLABLE');
  }
  return createInvoiceForSubscription(subscription, data, actorId);
}

export async function runBilling(input: unknown, actorId: string) {
  const { asOf = new Date() } = billingRunValidator.parse(input ?? {});

  const subscriptions = await findBillableSubscriptions(asOf);
  const invoiceNumbers: string[] = [];
  let createdCount = 0;
  let existingCount = 0;
  for (const subscription of subscriptions) {
    let periodStart = subscription.invoices[0]?.periodEnd
      ? new Date(subscription.invoices[0].periodEnd.getTime() + 1)
      : subscription.startDate;
    let iterations = 0;
    while (periodStart <= asOf && iterations < 1000) {
      const result = await createInvoiceForSubscription(
        subscription,
        { subscriptionId: subscription.id, periodStart, issueDate: asOf },
        actorId,
        asOf
      );
      invoiceNumbers.push(result.invoice.number);
      if (result.created) createdCount += 1;
      else existingCount += 1;
      periodStart = new Date(result.invoice.periodEnd.getTime() + 1);
      iterations += 1;
    }
  }

  return {
    asOf,
    processedSubscriptions: subscriptions.length,
    createdCount,
    existingCount,
    invoiceNumbers
  };
}

export async function applyInvoiceAction(id: string, input: unknown) {
  const data = invoiceActionValidator.parse(input) as InvoiceActionInput;
  const invoice = await getInvoice(id);
  const now = new Date();

  if (data.action === 'CONFIRM') {
    if (invoice.status !== 'DRAFT') {
      throw new ApiError('Only draft invoices can be confirmed', 409, 'INVALID_INVOICE_TRANSITION');
    }
    return invoiceView(
      await updateInvoice(id, {
        status: Number(invoice.total) === 0 ? 'PAID' : 'CONFIRMED',
        confirmedAt: now,
        ...(Number(invoice.total) === 0 ? { paidAt: now } : {})
      })
    );
  }

  if (data.action === 'CANCEL') {
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      throw new ApiError('Paid or cancelled invoices cannot be cancelled', 409, 'INVALID_INVOICE_TRANSITION');
    }
    return invoiceView(
      await updateInvoice(id, {
        status: 'CANCELLED',
        cancelledAt: now,
        cancellationReason: data.reason ?? null
      })
    );
  }

  if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') {
    throw new ApiError('Invoice must be confirmed before it can be sent or printed', 409, 'INVALID_INVOICE_ACTION');
  }

  return invoiceView(
    await updateInvoice(id, data.action === 'SEND' ? { sentAt: now } : { printedAt: now })
  );
}

export async function addPayment(id: string, input: unknown, actorId: string) {
  const data = paymentValidator.parse(input) as PaymentInput;
  const invoice = await getInvoice(id);
  if (invoice.status !== 'CONFIRMED') {
    throw new ApiError('Payments can only be recorded against confirmed invoices', 409, 'INVOICE_NOT_PAYABLE');
  }

  const result = await recordPayment(
    id,
    {
      amount: new Prisma.Decimal(data.amount),
      method: data.method,
      paidAt: data.paidAt,
      note: data.note,
      reference: data.reference,
      createdBy: { connect: { id: actorId } }
    },
    data.paidAt
  );
  if (!result) {
    throw new ApiError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }
  if (result.notPayable) {
    throw new ApiError('Payments can only be recorded against confirmed invoices', 409, 'INVOICE_NOT_PAYABLE');
  }
  if (result.overpayment) {
    throw new ApiError('Payment exceeds the invoice balance', 409, 'PAYMENT_EXCEEDS_BALANCE', {
      balanceDue: roundCurrency(result.remaining)
    });
  }

  return getInvoice(id);
}
