import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const traceId: RequestHandler = (_request, response, next) => {
  const value = randomUUID();
  response.locals.traceId = value;
  response.setHeader('X-Trace-Id', value);
  next();
};
