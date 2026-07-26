import { Router } from 'express';
import type { Pool } from 'mysql2/promise';
import { AppError } from '../errors/appError.js';
import { sendSuccess } from '../http/response.js';

export function createHealthRouter(pool: Pool): Router {
  const router = Router();

  router.get('/live', (_request, response) => {
    sendSuccess(response, { status: 'alive' as const });
  });

  router.get('/ready', async (_request, response, next) => {
    try {
      await pool.query('SELECT 1 AS ok');
      sendSuccess(response, { status: 'ready' as const });
    } catch (error) {
      next(
        new AppError({
          statusCode: 503,
          errorCode: 'DATABASE_UNAVAILABLE',
          errorMessage: '数据库不可用',
          cause: error,
        }),
      );
    }
  });

  return router;
}
