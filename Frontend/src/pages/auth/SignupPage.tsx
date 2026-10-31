import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input, PasswordInput } from '../../components/ui/FormControls';
import { PasswordChecklist } from '../../components/ui/PasswordChecklist';
import { apiFieldErrors, describeApiError, zodFieldErrors } from '../../lib/errors';
import { signupFormSchema } from '../../lib/validation';

interface SignupValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const initialValues: SignupValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
};

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<SignupValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: keyof SignupValues, value: string) {
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
    const result = signupFormSchema.safeParse(values);
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      setFormError(null);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await signup({
        name: result.data.name,
        email: result.data.email,
        password: result.data.password
      });
      navigate('/app', { replace: true });
    } catch (error) {
      setErrors(apiFieldErrors(error));
      setFormError(describeApiError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start with a customer account. Your team can upgrade your access later."
      footer={
        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}

        <Input
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Alex Morgan"
          value={values.name}
          onChange={(event) => updateField('name', event.target.value)}
          error={errors.name}
          leadingIcon={<UserRound size={17} />}
          data-autofocus
          required
        />

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
          required
        />

        <PasswordInput
          label="Password"
          name="password"
          autoComplete="new-password"
          placeholder="Create a strong password"
          value={values.password}
          onChange={(event) => updateField('password', event.target.value)}
          error={errors.password}
          leadingIcon={<Lock size={17} />}
          required
        />

        <PasswordChecklist value={values.password} />

        <PasswordInput
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={values.confirmPassword}
          onChange={(event) => updateField('confirmPassword', event.target.value)}
          error={errors.confirmPassword}
          leadingIcon={<Lock size={17} />}
          required
        />

        <Button type="submit" size="lg" loading={submitting} icon={<ArrowRight size={17} />}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
