export class ApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code = 'API_ERROR',
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
