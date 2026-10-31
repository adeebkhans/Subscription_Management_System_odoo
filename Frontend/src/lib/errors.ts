import type { ZodError } from 'zod';
import { ApiError } from './api';

export type FieldErrors = Record<string, string>;

export function zodFieldErrors(error: ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : 'form';
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

interface BackendValidationDetails {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
}

export function apiFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiError)) return {};
  if (!error.details || typeof error.details !== 'object') return {};

  const details = error.details as BackendValidationDetails;
  const errors: FieldErrors = {};

  if (details.fieldErrors) {
    for (const [key, messages] of Object.entries(details.fieldErrors)) {
      if (messages && messages.length > 0) {
        errors[key] = messages[0];
      }
    }
  }

  return errors;
}

export function describeApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR') {
      return 'Unable to connect right now. Please try again.';
    }
    if (error.code === 'VALIDATION_ERROR') {
      return 'Some fields need attention. Review the highlighted fields and try again.';
    }
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
