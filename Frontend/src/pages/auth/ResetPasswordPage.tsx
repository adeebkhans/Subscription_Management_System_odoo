import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Lock, ShieldAlert } from 'lucide-react';
import { api } from '../../lib/api';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { PasswordInput } from '../../components/ui/FormControls';
import { PasswordChecklist } from '../../components/ui/PasswordChecklist';
import { apiFieldErrors, describeApiError, zodFieldErrors } from '../../lib/errors';
import { resetPasswordFormSchema } from '../../lib/validation';

interface ResetValues {
  password: string;
  confirmPassword: string;
}

const initialValues: ResetValues = { password: '', confirmPassword: '' };

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [values, setValues] = useState<ResetValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  function updateField(field: keyof ResetValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = resetPasswordFormSchema.safeParse({ token, ...values });
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await api.auth.resetPassword({
        token: result.data.token,
        password: result.data.password,
        confirmPassword: result.data.confirmPassword
      });
      setComplete(true);
    } catch (caught) {
      setErrors(apiFieldErrors(caught));
      setFormError(describeApiError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout
        title="Reset link missing"
        subtitle="This password reset link is incomplete or has already been used."
        footer={
          <p>
            <Link to="/login" className="inline-link">
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </p>
        }
      >
        <div className="auth-success auth-success-warning">
          <span className="auth-success-icon">
            <ShieldAlert size={24} />
          </span>
          <p>Request a fresh reset link and try again.</p>
          <Link to="/forgot-password" className="button button-primary">
            <span>Request a new reset link</span>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={complete ? 'Password updated' : 'Choose a new password'}
      subtitle={
        complete
          ? 'Your password has been changed. Sign in with your new credentials.'
          : 'Use a strong password you have not used before.'
      }
      footer={
        <p>
          <Link to="/login" className="inline-link">
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </p>
      }
    >
      {complete ? (
        <div className="auth-success">
          <span className="auth-success-icon">
            <CheckCircle2 size={24} />
          </span>
          <p>You can now sign in to your Orbit workspace.</p>
          <Link to="/login" className="button button-primary button-lg">
            <span>Continue to sign in</span>
          </Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {formError && <Alert tone="error">{formError}</Alert>}

          <PasswordInput
            label="New password"
            name="password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            value={values.password}
            onChange={(event) => updateField('password', event.target.value)}
            error={errors.password}
            leadingIcon={<Lock size={17} />}
            data-autofocus
            required
          />

          <PasswordChecklist value={values.password} />

          <PasswordInput
            label="Confirm new password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Repeat your new password"
            value={values.confirmPassword}
            onChange={(event) => updateField('confirmPassword', event.target.value)}
            error={errors.confirmPassword}
            leadingIcon={<Lock size={17} />}
            required
          />

          <Button type="submit" size="lg" loading={submitting}>
            Update password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
