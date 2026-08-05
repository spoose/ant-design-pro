import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../src/errors/appError.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { traceId } from '../src/middleware/traceId.js';
import type {
  CreateOrganizationInput,
  DeleteOrganizationResult,
  OrganizationBootstrapAccess,
  OrganizationRepositoryPort,
  OrganizationSummary,
  UpdateOrganizationInput,
} from '../src/repositories/organizationRepository.js';
import { createAdminOrganizationsRouter } from '../src/routes/adminOrganizations.js';
import { OrganizationService } from '../src/services/organizationService.js';

const organizationId = '11111111-1111-4111-8111-111111111111';
const secondOrganizationId = '22222222-2222-4222-8222-222222222222';
const superAdminUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

class FakeOrganizationRepository implements OrganizationRepositoryPort {
  private readonly organizations = new Map<string, OrganizationSummary>();
  private readonly inUse = new Set<string>();
  private nextOrganizationId = secondOrganizationId;
  lastBootstrapAccess?: OrganizationBootstrapAccess;

  constructor() {
    const now = new Date('2026-07-22T00:00:00.000Z');
    this.organizations.set(organizationId, {
      organizationId,
      organizationCode: 'ORG1',
      organizationName: '组织一',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  async list(): Promise<OrganizationSummary[]> {
    return [...this.organizations.values()].sort((left, right) =>
      left.organizationCode.localeCompare(right.organizationCode),
    );
  }

  async create(
    input: CreateOrganizationInput,
    bootstrapAccess: OrganizationBootstrapAccess,
  ): Promise<OrganizationSummary> {
    if (
      [...this.organizations.values()].some(
        (organization) =>
          organization.organizationCode === input.organizationCode,
      )
    ) {
      throw new AppError({
        statusCode: 409,
        errorCode: 'ORGANIZATION_CODE_EXISTS',
        errorMessage: '组织编码已存在',
        details: { field: 'organizationCode' },
      });
    }
    const now = new Date('2026-07-22T01:00:00.000Z');
    const organization = {
      organizationId: this.nextOrganizationId,
      organizationCode: input.organizationCode,
      organizationName: input.organizationName,
      status: input.status,
      createdAt: now,
      updatedAt: now,
    } satisfies OrganizationSummary;
    this.lastBootstrapAccess = bootstrapAccess;
    this.organizations.set(organization.organizationId, organization);
    return organization;
  }

  async update(
    id: string,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationSummary | null> {
    const organization = this.organizations.get(id);
    if (!organization) return null;
    const updated = {
      ...organization,
      organizationName: input.organizationName ?? organization.organizationName,
      status: input.status ?? organization.status,
      updatedAt: new Date('2026-07-22T02:00:00.000Z'),
    };
    this.organizations.set(id, updated);
    return updated;
  }

  async deleteIfUnused(id: string): Promise<DeleteOrganizationResult> {
    if (!this.organizations.has(id)) return 'not_found';
    if (this.inUse.has(id)) return 'in_use';
    this.organizations.delete(id);
    return 'deleted';
  }

  markInUse(id: string): void {
    this.inUse.add(id);
  }
}

function createTestContext() {
  const repository = new FakeOrganizationRepository();
  const service = new OrganizationService(repository);
  const app = express();
  app.use(traceId);
  app.use(express.json());
  app.use((_request, response, next) => {
    response.locals.superAdminUserId = superAdminUserId;
    next();
  });
  app.use('/api/admin/organizations', createAdminOrganizationsRouter(service));
  app.use(errorHandler);
  return { app, repository };
}

describe('organization management flow', () => {
  let context: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    context = createTestContext();
  });

  it('lists organizations and creates a normalized organization', async () => {
    const listed = await request(context.app).get('/api/admin/organizations');
    expect(listed.status).toBe(200);
    expect(listed.body.data).toEqual([
      expect.objectContaining({
        organizationId,
        organizationCode: 'ORG1',
        organizationName: '组织一',
        status: 'active',
      }),
    ]);

    const created = await request(context.app)
      .post('/api/admin/organizations')
      .send({
        organizationCode: ' org_2 ',
        organizationName: ' 组织二 ',
        status: 'active',
      });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      organizationId: secondOrganizationId,
      organizationCode: 'ORG_2',
      organizationName: '组织二',
      status: 'active',
    });
    expect(context.repository.lastBootstrapAccess).toEqual({
      creatorUserId: superAdminUserId,
      permissions: ['organization:*'],
      skillCodes: ['file-review', 'document-summary', 'knowledge-search'],
    });
  });

  it('rejects duplicate codes and unknown create fields', async () => {
    const duplicate = await request(context.app)
      .post('/api/admin/organizations')
      .send({
        organizationCode: 'org1',
        organizationName: '重复组织',
        status: 'active',
      });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject({
      errorCode: 'ORGANIZATION_CODE_EXISTS',
      details: { field: 'organizationCode' },
    });

    const unknownField = await request(context.app)
      .post('/api/admin/organizations')
      .send({
        organizationCode: 'ORG2',
        organizationName: '组织二',
        status: 'active',
        owner: 'not-allowed',
      });
    expect(unknownField.status).toBe(400);
    expect(unknownField.body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('updates only mutable fields and rejects empty updates', async () => {
    const updated = await request(context.app)
      .patch(`/api/admin/organizations/${organizationId}`)
      .send({ organizationName: '新组织名称', status: 'disabled' });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      organizationCode: 'ORG1',
      organizationName: '新组织名称',
      status: 'disabled',
    });

    const empty = await request(context.app)
      .patch(`/api/admin/organizations/${organizationId}`)
      .send({});
    expect(empty.status).toBe(400);
    expect(empty.body.errorCode).toBe('VALIDATION_ERROR');

    const immutableCode = await request(context.app)
      .patch(`/api/admin/organizations/${organizationId}`)
      .send({ organizationCode: 'RENAMED' });
    expect(immutableCode.status).toBe(400);
    expect(immutableCode.body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('returns explicit errors for missing and referenced organizations', async () => {
    const missingId = '33333333-3333-4333-8333-333333333333';
    const missing = await request(context.app)
      .patch(`/api/admin/organizations/${missingId}`)
      .send({ status: 'disabled' });
    expect(missing.status).toBe(404);
    expect(missing.body.errorCode).toBe('ORGANIZATION_NOT_FOUND');

    context.repository.markInUse(organizationId);
    const inUse = await request(context.app).delete(
      `/api/admin/organizations/${organizationId}`,
    );
    expect(inUse.status).toBe(409);
    expect(inUse.body.errorCode).toBe('ORGANIZATION_IN_USE');
  });

  it('deletes an empty organization', async () => {
    const deleted = await request(context.app).delete(
      `/api/admin/organizations/${organizationId}`,
    );
    expect(deleted.status).toBe(200);
    expect(deleted.body.data).toEqual({ organizationId });

    const listed = await request(context.app).get('/api/admin/organizations');
    expect(listed.body.data).toEqual([]);
  });
});
