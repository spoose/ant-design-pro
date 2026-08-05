import type { RequestHandler } from 'express';
import { AppError } from '../errors/appError.js';
import type { UserRepositoryPort } from '../repositories/userRepository.js';
import type { AccessTokenService } from '../services/accessTokenService.js';

export function createAuthenticationMiddleware(
  tokens: AccessTokenService,
  users: UserRepositoryPort,
): RequestHandler {
  return async (request, response, next) => {
    try {
      const authorization = request.header('Authorization');
      if (!authorization) {
        throw new AppError({
          statusCode: 401,
          errorCode: 'ACCESS_TOKEN_MISSING',
          errorMessage: '缺少 Access Token',
        });
      }

      const parts = authorization.trim().split(/\s+/);
      if (
        parts.length !== 2 ||
        parts[0]?.toLowerCase() !== 'bearer' ||
        !parts[1]
      ) {
        throw new AppError({
          statusCode: 401,
          errorCode: 'ACCESS_TOKEN_INVALID',
          errorMessage: 'Access Token 无效',
        });
      }

      const claims = await tokens.verify(parts[1]);
      const user = await users.findAuthenticationUserById(claims.userId);
      if (
        user?.status !== 'active' ||
        user.tokenVersion !== claims.tokenVersion
      ) {
        throw new AppError({
          statusCode: 401,
          errorCode: 'ACCESS_TOKEN_INVALID',
          errorMessage: 'Access Token 无效',
        });
      }

      response.locals.authenticatedUserId = user.userId;
      response.locals.authenticatedTokenVersion = claims.tokenVersion;
      next();
    } catch (error) {
      next(error);
    }
  };
}
