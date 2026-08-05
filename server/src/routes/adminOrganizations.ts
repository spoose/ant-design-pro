import { Router } from 'express';
import { sendSuccess } from '../http/response.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import type {
  CreateOrganizationRequest,
  OrganizationParams,
  UpdateOrganizationRequest,
} from '../schemas/organization.js';
import {
  createOrganizationSchema,
  organizationParamsSchema,
  updateOrganizationSchema,
} from '../schemas/organization.js';
import type { OrganizationServicePort } from '../services/organizationService.js';

export function createAdminOrganizationsRouter(
  organizations: OrganizationServicePort,
): Router {
  const router = Router();

  router.get('/', async (_request, response, next) => {
    try {
      sendSuccess(response, await organizations.list());
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/',
    validateBody(createOrganizationSchema),
    async (_request, response, next) => {
      try {
        const organization = await organizations.create(
          response.locals.validatedBody as CreateOrganizationRequest,
          response.locals.superAdminUserId,
        );
        sendSuccess(response, organization, 201);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/:organizationId',
    validateParams(organizationParamsSchema),
    validateBody(updateOrganizationSchema),
    async (_request, response, next) => {
      try {
        const { organizationId } = response.locals
          .validatedParams as OrganizationParams;
        const organization = await organizations.update(
          organizationId,
          response.locals.validatedBody as UpdateOrganizationRequest,
        );
        sendSuccess(response, organization);
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/:organizationId',
    validateParams(organizationParamsSchema),
    async (_request, response, next) => {
      try {
        const { organizationId } = response.locals
          .validatedParams as OrganizationParams;
        sendSuccess(response, await organizations.delete(organizationId));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
