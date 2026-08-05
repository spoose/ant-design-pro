import { Router } from 'express';
import { sendSuccess } from '../http/response.js';
import { validateBody } from '../middleware/validate.js';
import type {
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../schemas/passwordReset.js';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/passwordReset.js';
import type { PasswordResetServicePort } from '../services/passwordResetService.js';

export function createPasswordResetRouter(
  passwordResetService: PasswordResetServicePort,
): Router {
  const router = Router();

  router.post(
    '/forgot',
    validateBody(forgotPasswordSchema),
    async (_request, response, next) => {
      try {
        const result = await passwordResetService.requestReset(
          response.locals.validatedBody as ForgotPasswordRequest,
        );
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Pragma', 'no-cache');
        sendSuccess(response, result, 202);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/reset',
    validateBody(resetPasswordSchema),
    async (_request, response, next) => {
      try {
        const result = await passwordResetService.resetPassword(
          response.locals.validatedBody as ResetPasswordRequest,
        );
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Pragma', 'no-cache');
        sendSuccess(response, result);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
