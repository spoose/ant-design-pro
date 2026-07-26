import type { RequestHandler } from 'express';
import { AppError } from '../errors/appError.js';
import type { UserRepositoryPort } from '../repositories/userRepository.js';

export function createSuperAdminMiddleware(
  users: UserRepositoryPort,
): RequestHandler {
  return async (_request, response, next) => {
    try {
      const userId = response.locals.authenticatedUserId;
      const tokenVersion = response.locals.authenticatedTokenVersion;
      if (typeof userId !== 'string' || !Number.isSafeInteger(tokenVersion)) {
        throw new AppError({
          statusCode: 500,
          errorCode: 'INTERNAL_ERROR',
          errorMessage: '认证上下文缺失',
        });
      }

      const user = await users.findAuthenticationUserById(userId);
      if (user?.status !== 'active' || user.tokenVersion !== tokenVersion) {
        throw new AppError({
          statusCode: 401,
          errorCode: 'ACCESS_TOKEN_INVALID',
          errorMessage: 'Access Token 无效',
        });
      }
      if (!user.isSuperAdmin) {
        throw new AppError({
          statusCode: 403,
          errorCode: 'SUPER_ADMIN_REQUIRED',
          errorMessage: '此操作仅允许 Super Admin',
        });
      }

      response.locals.superAdminUserId = user.userId;
      next();
    } catch (error) {
      next(error);
    }
  };
}
