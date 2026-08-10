import type { RequestHandler } from 'express';
import { Router } from 'express';
import { sendSuccess } from '../http/response.js';
import { validateBody } from '../middleware/validate.js';
import type {
  SetDefaultOrganizationRequest,
  UpdateCurrentUserProfileRequest,
} from '../schemas/userPreferences.js';
import {
  setDefaultOrganizationSchema,
  updateCurrentUserProfileSchema,
} from '../schemas/userPreferences.js';
import type { CurrentUserServicePort } from '../services/currentUserService.js';

export function createUserPreferencesRouter(
  authenticate: RequestHandler,
  currentUsers: CurrentUserServicePort,
): Router {
  const router = Router();

  const updateCurrentUserProfile: RequestHandler = async (
    _request,
    response,
    next,
  ) => {
    try {
      const body = response.locals
        .validatedBody as UpdateCurrentUserProfileRequest;
      const user = await currentUsers.updateCurrentUserProfile(
        response.locals.authenticatedUserId,
        {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.avatar !== undefined ? { avatar: body.avatar } : {}),
        },
      );
      sendSuccess(response, user);
    } catch (error) {
      next(error);
    }
  };

  router.post(
    '/me/update',
    authenticate,
    validateBody(updateCurrentUserProfileSchema),
    updateCurrentUserProfile,
  );

  const setDefaultOrganization: RequestHandler = async (
    _request,
    response,
    next,
  ) => {
    try {
      const { organizationId } = response.locals
        .validatedBody as SetDefaultOrganizationRequest;
      /*
       * 核心链路：JWT sub -> authenticatedUserId -> 实时 Organization Access
       * -> users.default_organization_id。请求体中的 ID 不能单独作为授权依据。
       */
      const result = await currentUsers.setDefaultOrganization(
        response.locals.authenticatedUserId,
        organizationId,
      );
      sendSuccess(response, result);
    } catch (error) {
      next(error);
    }
  };

  router.post(
    '/me/default-organization/set',
    authenticate,
    validateBody(setDefaultOrganizationSchema),
    setDefaultOrganization,
  );

  return router;
}
