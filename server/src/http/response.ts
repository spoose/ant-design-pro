import type { Response } from 'express';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  traceId: string;
}

export interface ApiError {
  success: false;
  errorCode: string;
  errorMessage: string;
  details?: Record<string, unknown>;
  traceId: string;
}

export function sendSuccess<T>(
  response: Response,
  data: T,
  statusCode = 200,
): Response<ApiSuccess<T>> {
  return response.status(statusCode).json({
    success: true,
    data,
    traceId: response.locals.traceId,
  });
}
