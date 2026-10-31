import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input, PasswordInput } from '../../components/ui/FormControls';
import { apiFieldErrors, describeApiError, zodFieldErrors } from '../../lib/errors';
import { loginFormSchema } from '../../lib/validation';

interface LoginValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState<LoginValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/app';

  function updateField(field: keyof LoginValues, value: string) {
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
    const result = loginFormSchema.safeParse(values);
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      setFormError(null);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await login(result.data);
      navigate(from, { replace: true });
    } catch (error) {
      setErrors(apiFieldErrors(error));
      setFormError(describeApiError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your subscription workspace."
      footer={
        <p>
          New to Orbit? <Link to="/signup">Create an account</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}

        <Input
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={values.email}
          onChange={(event) => updateField('email', event.target.value)}
          error={errors.email}
          leadingIcon={<Mail size={17} />}
          data-autofocus
          required
        />

        <PasswordInput
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={values.password}
          onChange={(event) => updateField('password', event.target.value)}
          error={errors.password}
          leadingIcon={<Lock size={17} />}
          required
        />

        <div className="auth-form-row">
          <Link to="/forgot-password" className="text-link">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" loading={submitting} icon={<ArrowRight size={17} />}>
          Sign in
        </Button>

      </form>
    </AuthLayout>
  );
}
