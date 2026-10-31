import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from './ApiError.js';

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

  console.error(error);
  return response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
};
