import { useCallback, useState } from 'react';
import type { FieldErrors } from '../lib/errors';

export function useFormState<T extends object>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(String(key) in current)) return current;
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
  }, []);

  const reset = useCallback((nextValues: T) => {
    setValues(nextValues);
    setErrors({});
    setFormError(null);
    setSubmitting(false);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setFormError(null);
  }, []);

  return {
    values,
    setValues,
    errors,
    setErrors,
    formError,
    setFormError,
    submitting,
    setSubmitting,
    setValue,
    reset,
    clearErrors
  };
}
