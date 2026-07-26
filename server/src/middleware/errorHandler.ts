import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/appError.js';
import type { ApiError } from '../http/response.js';

interface JsonSyntaxError extends SyntaxError {
  status?: number;
  body?: unknown;
}

function isJsonSyntaxError(error: unknown): error is JsonSyntaxError {
  return (
    error instanceof SyntaxError &&
    (error as JsonSyntaxError).status === 400 &&
    'body' in error
  );
}

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  const normalizedError = isJsonSyntaxError(error)
    ? new AppError({
        statusCode: 400,
        errorCode: 'INVALID_JSON',
        errorMessage: '请求体不是有效的 JSON',
        cause: error,
      })
    : error;

  const appError =
    normalizedError instanceof AppError
      ? normalizedError
      : new AppError({
          statusCode: 500,
          errorCode: 'INTERNAL_ERROR',
          errorMessage: '服务器内部错误',
          cause: normalizedError,
        });

  if (appError.statusCode >= 500) {
    console.error('Request failed', {
      traceId: response.locals.traceId,
      errorCode: appError.errorCode,
      errorName: appError.name,
      errorMessage: appError.message,
      stack: appError.stack,
      causeCode:
        appError.cause instanceof Error && 'code' in appError.cause
          ? appError.cause.code
          : undefined,
    });
  }

  const body: ApiError = {
    success: false,
    errorCode: appError.errorCode,
    errorMessage: appError.message,
    traceId: response.locals.traceId,
    ...(appError.details ? { details: appError.details } : {}),
  };
  response.status(appError.statusCode).json(body);
};
