import { env } from '../../config/env.js';

type MailInput = {
  to: string;
  subject: string;
  text: string;
};

// No SMTP provider is configured yet, so messages are logged to keep the
// password reset flow usable in local development.
export async function sendMail(input: MailInput) {
  if (env.NODE_ENV === 'test') {
    return;
  }

  console.info(`[mail] to=${input.to} subject=${input.subject} body=${input.text}`);
}
