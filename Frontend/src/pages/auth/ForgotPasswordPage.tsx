import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MailCheck, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/FormControls';
import { describeApiError, zodFieldErrors } from '../../lib/errors';
import { forgotPasswordFormSchema } from '../../lib/validation';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = forgotPasswordFormSchema.safeParse({ email });
    if (!result.success) {
      setError(zodFieldErrors(result.error).email);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await api.auth.forgotPassword(result.data.email);
      setSent(true);
    } catch (caught) {
      setFormError(describeApiError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={sent ? 'Check your inbox' : 'Reset your password'}
      subtitle={
        sent
          ? 'If an account exists for that address, a reset link is on its way.'
          : 'Enter the email linked to your account and we will send reset instructions.'
      }
      footer={
        <p>
          <Link to="/login" className="inline-link">
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="auth-success">
          <span className="auth-success-icon">
            <MailCheck size={24} />
          </span>
          <p>
            We sent reset instructions to <strong>{email}</strong>. The link expires after
            one hour.
          </p>
          <Button variant="secondary" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {formError && <Alert tone="error">{formError}</Alert>}

          <Input
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError(undefined);
            }}
            error={error}
            leadingIcon={<Mail size={17} />}
            data-autofocus
            required
          />

          <Button type="submit" size="lg" loading={submitting} icon={<Send size={16} />}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
