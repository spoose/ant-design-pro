import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../errors/appError.js';

export function validateBody(schema: ZodType): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(
        new AppError({
          statusCode: 400,
          errorCode: 'VALIDATION_ERROR',
          errorMessage: '请求字段不合法',
          details: {
            fields: result.error.issues.map((issue) => ({
              field: issue.path.join('.') || 'body',
              message:
                issue.code === 'unrecognized_keys'
                  ? '包含未允许的字段'
                  : issue.message,
            })),
          },
        }),
      );
      return;
    }

    response.locals.validatedBody = result.data;
    next();
  };
}

export function validateParams(schema: ZodType): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      next(
        new AppError({
          statusCode: 400,
          errorCode: 'VALIDATION_ERROR',
          errorMessage: '请求参数不合法',
          details: {
            fields: result.error.issues.map((issue) => ({
              field: issue.path.join('.') || 'params',
              message:
                issue.code === 'unrecognized_keys'
                  ? '包含未允许的参数'
                  : issue.message,
            })),
          },
        }),
      );
      return;
    }

    response.locals.validatedParams = result.data;
    next();
  };
}

export function validateQuery(schema: ZodType): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      next(
        new AppError({
          statusCode: 400,
          errorCode: 'VALIDATION_ERROR',
          errorMessage: '查询参数不合法',
          details: {
            fields: result.error.issues.map((issue) => ({
              field: issue.path.join('.') || 'query',
              message:
                issue.code === 'unrecognized_keys'
                  ? '包含未允许的查询参数'
                  : issue.message,
            })),
          },
        }),
      );
      return;
    }

    response.locals.validatedQuery = result.data;
    next();
  };
}
