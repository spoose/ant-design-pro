import type { RequestHandler } from 'express';
import { Router } from 'express';
import { sendSuccess } from '../http/response.js';
import type { CurrentUserServicePort } from '../services/currentUserService.js';

export function createCurrentUserRouter(
  authenticate: RequestHandler,
  currentUserService: CurrentUserServicePort,
): Router {
  const router = Router();

  router.get('/', authenticate, async (_request, response, next) => {
    try {
      const user = await currentUserService.getCurrentUser(
        response.locals.authenticatedUserId,
      );
      sendSuccess(response, user);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
