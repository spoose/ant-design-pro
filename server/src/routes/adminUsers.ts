import type { RequestHandler } from 'express';
import { Router } from 'express';
import { AppError } from '../errors/appError.js';
import { sendSuccess } from '../http/response.js';
import { validateQuery } from '../middleware/validate.js';
import type { AdminUserListQuery } from '../schemas/adminUser.js';
import { adminUserListQuerySchema } from '../schemas/adminUser.js';
import type { AdminUserServicePort } from '../services/adminUserService.js';

const featureNotImplemented: RequestHandler = (_request, _response, next) => {
  next(
    new AppError({
      statusCode: 501,
      errorCode: 'FEATURE_NOT_IMPLEMENTED',
      errorMessage: '人员新增、修改和删除接口已预留，当前版本尚未实现',
    }),
  );
};

export function createAdminUsersRouter(users: AdminUserServicePort): Router {
  const router = Router();

  router.get(
    '/',
    validateQuery(adminUserListQuerySchema),
    async (_request, response, next) => {
      try {
        sendSuccess(
          response,
          await users.list(
            response.locals.validatedQuery as AdminUserListQuery,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post('/', featureNotImplemented);
  router.patch('/:userId', featureNotImplemented);
  router.delete('/:userId', featureNotImplemented);

  return router;
}
