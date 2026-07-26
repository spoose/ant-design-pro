import type { RequestHandler } from 'express';
import { Router } from 'express';
import { sendSuccess } from '../http/response.js';
import { validateBody } from '../middleware/validate.js';
import type { SetDefaultOrganizationRequest } from '../schemas/userPreferences.js';
import { setDefaultOrganizationSchema } from '../schemas/userPreferences.js';
import type { CurrentUserServicePort } from '../services/currentUserService.js';

export function createUserPreferencesRouter(
  authenticate: RequestHandler,
  currentUsers: CurrentUserServicePort,
): Router {
  const router = Router();

  router.put(
    '/me/default-organization',
    authenticate,
    validateBody(setDefaultOrganizationSchema),
    async (_request, response, next) => {
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
    },
  );

  return router;
}
