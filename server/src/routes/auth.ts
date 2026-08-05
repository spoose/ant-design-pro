import { Router } from 'express';
import { sendSuccess } from '../http/response.js';
import { validateBody } from '../middleware/validate.js';
import type { LoginRequest, RegisterRequest } from '../schemas/auth.js';
import { loginSchema, registerSchema } from '../schemas/auth.js';
import type { AuthServicePort } from '../services/authService.js';

export function createAuthRouter(authService: AuthServicePort): Router {
  const router = Router();

  router.post(
    '/register',
    validateBody(registerSchema),
    async (_request, response, next) => {
      try {
        const user = await authService.register(
          response.locals.validatedBody as RegisterRequest,
        );
        sendSuccess(response, user, 201);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/login/account',
    validateBody(loginSchema),
    async (_request, response, next) => {
      try {
        const token = await authService.login(
          response.locals.validatedBody as LoginRequest,
        );
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Pragma', 'no-cache');
        sendSuccess(response, token);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
