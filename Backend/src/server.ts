import { createApp } from './app.js';
import { env } from './config/env.js';
import { startSubscriptionExpiryJob } from './jobs/subscription-expiry.job.js';

createApp().listen(env.PORT, () => {
  console.info(`Subscription backend listening on port ${env.PORT}`);
  startSubscriptionExpiryJob();
});
