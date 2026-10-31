import type { SubscriptionStatus } from '@prisma/client';
import { ApiError } from '../../core/errors/ApiError.js';

export type SubscriptionAction =
  | 'SUBMIT'
  | 'CONFIRM'
  | 'ACTIVATE'
  | 'PAUSE'
  | 'RESUME'
  | 'CLOSE'
  | 'CANCEL';

export type PlanPolicy = {
  allowEarlyClose: boolean;
  allowPause: boolean;
  allowRenew: boolean;
  autoClose: boolean;
};

export type LifecycleSubject = {
  status: SubscriptionStatus;
  startDate: Date;
  expiryDate: Date | null;
  quotationValidUntil: Date | null;
};

const transitions: Record<SubscriptionAction, SubscriptionStatus[]> = {
  SUBMIT: ['DRAFT'],
  CONFIRM: ['QUOTATION'],
  ACTIVATE: ['CONFIRMED'],
  PAUSE: ['ACTIVE'],
  RESUME: ['PAUSED'],
  CLOSE: ['CONFIRMED', 'ACTIVE', 'PAUSED'],
  CANCEL: ['DRAFT', 'QUOTATION', 'CONFIRMED']
};

const targetStatus: Record<SubscriptionAction, SubscriptionStatus> = {
  SUBMIT: 'QUOTATION',
  CONFIRM: 'CONFIRMED',
  ACTIVATE: 'ACTIVE',
  PAUSE: 'PAUSED',
  RESUME: 'ACTIVE',
  CLOSE: 'CLOSED',
  CANCEL: 'CANCELLED'
};

export function isTransitionAllowed(status: SubscriptionStatus, action: SubscriptionAction) {
  return transitions[action].includes(status);
}

export function isQuotationExpired(subscription: LifecycleSubject, now = new Date()) {
  return Boolean(
    subscription.quotationValidUntil && subscription.quotationValidUntil.getTime() < now.getTime()
  );
}

export function isExpired(subscription: LifecycleSubject, now = new Date()) {
  return Boolean(subscription.expiryDate && subscription.expiryDate.getTime() <= now.getTime());
}

export function assertTransition(
  subscription: LifecycleSubject,
  policy: PlanPolicy,
  action: SubscriptionAction,
  now = new Date()
) {
  if (!isTransitionAllowed(subscription.status, action)) {
    throw new ApiError(
      `Cannot ${action.toLowerCase()} a subscription in ${subscription.status} status`,
      409,
      'INVALID_TRANSITION',
      { status: subscription.status, action }
    );
  }

  if (action === 'CONFIRM' && isQuotationExpired(subscription, now)) {
    throw new ApiError('Quotation has expired', 409, 'QUOTATION_EXPIRED', {
      quotationValidUntil: subscription.quotationValidUntil
    });
  }

  if (action === 'PAUSE' && !policy.allowPause) {
    throw new ApiError('This plan does not allow pausing', 409, 'PAUSE_NOT_ALLOWED');
  }

  if (action === 'CLOSE' && !policy.allowEarlyClose && !isExpired(subscription, now)) {
    throw new ApiError('This plan does not allow closing before the expiry date', 409, 'EARLY_CLOSE_NOT_ALLOWED', {
      expiryDate: subscription.expiryDate
    });
  }

  return targetStatus[action];
}

export function availableActions(
  subscription: LifecycleSubject,
  policy: PlanPolicy,
  now = new Date()
): SubscriptionAction[] {
  return (Object.keys(transitions) as SubscriptionAction[]).filter((action) => {
    try {
      assertTransition(subscription, policy, action, now);
      return true;
    } catch {
      return false;
    }
  });
}

export function shouldAutoClose(
  subscription: LifecycleSubject,
  policy: PlanPolicy,
  now = new Date()
) {
  return policy.autoClose && subscription.status === 'ACTIVE' && isExpired(subscription, now);
}
