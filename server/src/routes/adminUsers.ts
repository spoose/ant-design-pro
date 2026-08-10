import type { RequestHandler } from 'express';
import { Router } from 'express';
import { AppError } from '../errors/appError.js';
import { sendSuccess } from '../http/response.js';
import { validateBody } from '../middleware/validate.js';
import type {
  AdminUserListRequest,
  SetAdminUserOrganizationsRequest,
  SetAdminUserStatusRequest,
} from '../schemas/adminUser.js';
import {
  adminUserListBodySchema,
  setAdminUserOrganizationsBodySchema,
  setAdminUserStatusBodySchema,
} from '../schemas/adminUser.js';
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

  const listUsers: RequestHandler = async (_request, response, next) => {
    try {
      sendSuccess(
        response,
        await users.list(response.locals.validatedBody as AdminUserListRequest),
      );
    } catch (error) {
      next(error);
    }
  };

  router.post('/list', validateBody(adminUserListBodySchema), listUsers);
  router.post(
    '/organizations/set',
    validateBody(setAdminUserOrganizationsBodySchema),
    async (_request, response, next) => {
      try {
        const input = response.locals
          .validatedBody as SetAdminUserOrganizationsRequest;
        sendSuccess(
          response,
          await users.setOrganizations(input.userId, input.organizationIds),
        );
      } catch (error) {
        next(error);
      }
    },
  );
  router.post(
    '/status/set',
    validateBody(setAdminUserStatusBodySchema),
    async (_request, response, next) => {
      try {
        const input = response.locals
          .validatedBody as SetAdminUserStatusRequest;
        sendSuccess(
          response,
          await users.setStatus(
            response.locals.superAdminUserId,
            input.userId,
            input.status,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );
  router.post('/create', featureNotImplemented);
  router.post('/update', featureNotImplemented);
  router.post('/delete', featureNotImplemented);

  return router;
}
