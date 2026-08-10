import type { RequestHandler } from 'express';
import { Router } from 'express';
import { sendSuccess } from '../http/response.js';
import { validateBody } from '../middleware/validate.js';
import type {
  CreateOrganizationRequest,
  DeleteOrganizationCommandRequest,
  UpdateOrganizationCommandRequest,
} from '../schemas/organization.js';
import {
  createOrganizationSchema,
  deleteOrganizationCommandSchema,
  updateOrganizationCommandSchema,
} from '../schemas/organization.js';
import type { OrganizationServicePort } from '../services/organizationService.js';

export function createAdminOrganizationsRouter(
  organizations: OrganizationServicePort,
): Router {
  const router = Router();

  const listOrganizations: RequestHandler = async (
    _request,
    response,
    next,
  ) => {
    try {
      sendSuccess(response, await organizations.list());
    } catch (error) {
      next(error);
    }
  };

  const createOrganization: RequestHandler = async (
    _request,
    response,
    next,
  ) => {
    try {
      const organization = await organizations.create(
        response.locals.validatedBody as CreateOrganizationRequest,
        response.locals.superAdminUserId,
      );
      sendSuccess(response, organization, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateOrganization: RequestHandler = async (
    _request,
    response,
    next,
  ) => {
    try {
      const body = response.locals
        .validatedBody as UpdateOrganizationCommandRequest;
      const { organizationId, ...update } = body;
      const organization = await organizations.update(organizationId, update);
      sendSuccess(response, organization);
    } catch (error) {
      next(error);
    }
  };

  const deleteOrganization: RequestHandler = async (
    _request,
    response,
    next,
  ) => {
    try {
      const { organizationId } = response.locals
        .validatedBody as DeleteOrganizationCommandRequest;
      sendSuccess(response, await organizations.delete(organizationId));
    } catch (error) {
      next(error);
    }
  };

  router.post('/list', listOrganizations);
  router.post(
    '/create',
    validateBody(createOrganizationSchema),
    createOrganization,
  );
  router.post(
    '/update',
    validateBody(updateOrganizationCommandSchema),
    updateOrganization,
  );
  router.post(
    '/delete',
    validateBody(deleteOrganizationCommandSchema),
    deleteOrganization,
  );

  return router;
}
