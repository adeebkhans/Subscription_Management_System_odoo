import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from './ApiError.js';

function isPrismaError(error: unknown, code: string) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

function isHttpError(error: unknown): error is { statusCode: number; type?: string } {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as { statusCode?: unknown; status?: unknown; type?: unknown };

  if (typeof candidate.type === 'string' && candidate.type === 'entity.parse.failed') {
    return true;
  }

  const status = typeof candidate.statusCode === 'number' ? candidate.statusCode : candidate.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    return response.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.flatten() }
    });
  }

  if (error instanceof ApiError) {
    return response.status(error.statusCode).json({
      error: { code: error.code, message: error.message, details: error.details }
    });
  }

  if (isPrismaError(error, 'P2002')) {
    return response.status(409).json({
      error: { code: 'DUPLICATE_RECORD', message: 'Record already exists' }
    });
  }

  if (isPrismaError(error, 'P2025')) {
    return response.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Record not found' }
    });
  }

  if (isPrismaError(error, 'P2003')) {
    return response.status(409).json({
      error: { code: 'RELATED_RECORD_CONFLICT', message: 'Record is still referenced by related data' }
    });
  }

  if (isHttpError(error)) {
    const message =
      error.type === 'entity.parse.failed' ? 'Request body is not valid JSON' : 'Request could not be processed';

    return response.status(error.statusCode).json({
      error: { code: error.type === 'entity.parse.failed' ? 'INVALID_JSON' : 'BAD_REQUEST', message }
    });
  }

  console.error(error);
  return response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
};
