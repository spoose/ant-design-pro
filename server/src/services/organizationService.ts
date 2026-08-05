import { AppError } from '../errors/appError.js';
import {
  SUPER_ADMIN_ORGANIZATION_PERMISSIONS,
  SUPER_ADMIN_ORGANIZATION_SKILL_CODES,
} from '../permissions/catalog.js';
import type {
  CreateOrganizationInput,
  OrganizationRepositoryPort,
  OrganizationSummary,
  UpdateOrganizationInput,
} from '../repositories/organizationRepository.js';

export interface OrganizationServicePort {
  list(): Promise<OrganizationSummary[]>;
  create(
    input: CreateOrganizationInput,
    creatorUserId: string,
  ): Promise<OrganizationSummary>;
  update(
    organizationId: string,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationSummary>;
  delete(organizationId: string): Promise<{ organizationId: string }>;
}

export class OrganizationService implements OrganizationServicePort {
  constructor(private readonly organizations: OrganizationRepositoryPort) {}

  list(): Promise<OrganizationSummary[]> {
    return this.organizations.list();
  }

  create(
    input: CreateOrganizationInput,
    creatorUserId: string,
  ): Promise<OrganizationSummary> {
    return this.organizations.create(input, {
      creatorUserId,
      permissions: SUPER_ADMIN_ORGANIZATION_PERMISSIONS,
      skillCodes: SUPER_ADMIN_ORGANIZATION_SKILL_CODES,
    });
  }

  async update(
    organizationId: string,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationSummary> {
    const organization = await this.organizations.update(
      organizationId,
      input,
    );
    if (!organization) {
      throw new AppError({
        statusCode: 404,
        errorCode: 'ORGANIZATION_NOT_FOUND',
        errorMessage: '组织不存在',
      });
    }
    return organization;
  }

  async delete(organizationId: string): Promise<{ organizationId: string }> {
    const result = await this.organizations.deleteIfUnused(organizationId);
    if (result === 'not_found') {
      throw new AppError({
        statusCode: 404,
        errorCode: 'ORGANIZATION_NOT_FOUND',
        errorMessage: '组织不存在',
      });
    }
    if (result === 'in_use') {
      throw new AppError({
        statusCode: 409,
        errorCode: 'ORGANIZATION_IN_USE',
        errorMessage: '组织包含非初始化成员或授权，无法删除',
      });
    }
    return { organizationId };
  }
}
