import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { sendSuccess } from '../src/http/response.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { createSuperAdminMiddleware } from '../src/middleware/superAdmin.js';
import { traceId } from '../src/middleware/traceId.js';
import type {
  AuthenticationUser,
  UserRepositoryPort,
} from '../src/repositories/userRepository.js';

function createUser(
  overrides: Partial<AuthenticationUser> = {},
): AuthenticationUser {
  return {
    userId: 'user-1',
    username: 'user-1',
    email: 'user-1@example.com',
    name: 'User One',
    avatar: null,
    status: 'active',
    isSuperAdmin: false,
    defaultOrganizationId: null,
    tokenVersion: 0,
    passwordHash: 'not-used',
    ...overrides,
  };
}

function createRepository(user: AuthenticationUser | null): UserRepositoryPort {
  return {
    createUser: vi.fn(),
    findAuthenticationUserByAccount: vi.fn(),
    findAuthenticationUserById: vi.fn().mockResolvedValue(user),
    getCurrentUser: vi.fn(),
    setDefaultOrganization: vi.fn(),
  };
}

function createApp(user: AuthenticationUser | null) {
  const app = express();
  app.use(traceId);
  app.use((_request, response, next) => {
    response.locals.authenticatedUserId = 'user-1';
    response.locals.authenticatedTokenVersion = 0;
    next();
  });
  app.get(
    '/admin-probe',
    createSuperAdminMiddleware(createRepository(user)),
    (_request, response) => sendSuccess(response, { allowed: true }),
  );
  app.use(errorHandler);
  return app;
}

describe('createSuperAdminMiddleware', () => {
  it('rejects a normal user even if authentication already succeeded', async () => {
    const response = await request(createApp(createUser())).get('/admin-probe');

    expect(response.status).toBe(403);
    expect(response.body.errorCode).toBe('SUPER_ADMIN_REQUIRED');
  });

  it('allows an active database-backed Super Admin', async () => {
    const response = await request(
      createApp(createUser({ isSuperAdmin: true })),
    ).get('/admin-probe');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ allowed: true });
  });

  it('rejects a disabled Super Admin with an invalid authentication state', async () => {
    const response = await request(
      createApp(createUser({ isSuperAdmin: true, status: 'disabled' })),
    ).get('/admin-probe');

    expect(response.status).toBe(401);
    expect(response.body.errorCode).toBe('ACCESS_TOKEN_INVALID');
  });
});
