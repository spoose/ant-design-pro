import { AppError } from '../errors/appError.js';

interface MySqlError extends Error {
  code?: string;
}

const DATABASE_UNAVAILABLE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EPIPE',
  'ETIMEDOUT',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_SEQUENCE_TIMEOUT',
  'ER_CON_COUNT_ERROR',
  'ER_SERVER_SHUTDOWN',
]);

function isMySqlError(error: unknown): error is MySqlError {
  return error instanceof Error && 'code' in error;
}

export async function databaseOperation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (
      isMySqlError(error) &&
      error.code &&
      DATABASE_UNAVAILABLE_CODES.has(error.code)
    ) {
      throw new AppError({
        statusCode: 503,
        errorCode: 'DATABASE_UNAVAILABLE',
        errorMessage: '数据库不可用',
        cause: error,
      });
    }
    throw error;
  }
}
