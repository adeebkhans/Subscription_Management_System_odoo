import { createApp } from './app.js';
import { env } from './config/env.js';

createApp().listen(env.PORT, () => {
  console.log(`Subscription backend listening on port ${env.PORT}`);
});
