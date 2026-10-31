import { ApiError } from '../core/errors/ApiError.js';
import { autoCloseExpiredSubscriptions } from '../modules/subscriptions/subscription.services.js';

const intervalMs = 15 * 60 * 1000;

export async function runSubscriptionExpiryJob() {
  try {
    const result = await autoCloseExpiredSubscriptions();
    if (result.closedCount > 0) {
      console.info(`[jobs] auto-closed ${result.closedCount} expired subscriptions`);
    }
    return result;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'unexpected failure';
    console.error(`[jobs] subscription expiry run failed: ${message}`);
    return { closedCount: 0, closedIds: [] as string[] };
  }
}

export function startSubscriptionExpiryJob() {
  const timer = setInterval(() => {
    void runSubscriptionExpiryJob();
  }, intervalMs);

  timer.unref();
  void runSubscriptionExpiryJob();
  return timer;
}
