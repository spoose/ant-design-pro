import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { traceId } from '../src/middleware/traceId.js';
import type { AdminUserListInput } from '../src/repositories/adminUserRepository.js';
import { createAdminUsersRouter } from '../src/routes/adminUsers.js';
import type { AdminUserServicePort } from '../src/services/adminUserService.js';

class FakeAdminUserService implements AdminUserServicePort {
  lastInput?: AdminUserListInput;

  async list(input: AdminUserListInput) {
    this.lastInput = input;
    return {
      list: [
        {
          userId: '11111111-1111-4111-8111-111111111111',
          username: 'sadmin',
          email: 'sadmin@example.com',
          name: 'Super Admin',
          avatar: null,
          status: 'active' as const,
          isSuperAdmin: true,
          defaultOrganizationId: null,
          createdAt: new Date('2026-07-22T00:00:00.000Z'),
          updatedAt: new Date('2026-07-22T00:00:00.000Z'),
          deletedAt: null,
        },
      ],
      page: input.page,
      pageSize: input.pageSize,
      total: 1,
    };
  }
}

function createTestContext() {
  const service = new FakeAdminUserService();
  const app = express();
  app.use(traceId);
  app.use(express.json());
  app.use('/api/admin/users', createAdminUsersRouter(service));
  app.use(errorHandler);
  return { app, service };
}

describe('Super Admin user list flow', () => {
  let context: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    context = createTestContext();
  });

  it('returns a validated page of all matching users', async () => {
    const response = await request(context.app).get(
      '/api/admin/users?page=2&pageSize=20&keyword=admin&status=active&sortBy=username&sortOrder=asc',
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      page: 2,
      pageSize: 20,
      total: 1,
      list: [
        {
          username: 'sadmin',
          isSuperAdmin: true,
          status: 'active',
        },
      ],
    });
    expect(context.service.lastInput).toEqual({
      page: 2,
      pageSize: 20,
      keyword: 'admin',
      status: 'active',
      sortBy: 'username',
      sortOrder: 'asc',
    });
  });

  it('rejects missing pagination and unknown query fields', async () => {
    const response = await request(context.app).get(
      '/api/admin/users?legacyPage=1',
    );

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    expect(context.service.lastInput).toBeUndefined();
  });

  it.each([
    ['post', '/api/admin/users'],
    ['patch', '/api/admin/users/11111111-1111-4111-8111-111111111111'],
    ['delete', '/api/admin/users/11111111-1111-4111-8111-111111111111'],
  ] as const)('reserves %s %s without mutating data', async (method, path) => {
    const response = await request(context.app)[method](path).send({});

    expect(response.status).toBe(501);
    expect(response.body).toMatchObject({
      success: false,
      errorCode: 'FEATURE_NOT_IMPLEMENTED',
    });
  });
});
