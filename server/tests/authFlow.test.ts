import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../src/errors/appError.js';
import { createAuthenticationMiddleware } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { traceId } from '../src/middleware/traceId.js';
import type {
  AuthCurrentUser,
  AuthenticationUser,
  CreateUserInput,
  RegisteredUser,
  SetDefaultOrganizationResult,
  UserRepositoryPort,
} from '../src/repositories/userRepository.js';
import { createAuthRouter } from '../src/routes/auth.js';
import { createCurrentUserRouter } from '../src/routes/currentUser.js';
import { createLogoutRouter } from '../src/routes/logout.js';
import { createUserPreferencesRouter } from '../src/routes/userPreferences.js';
import { AccessTokenService } from '../src/services/accessTokenService.js';
import { AuthService } from '../src/services/authService.js';
import { CurrentUserService } from '../src/services/currentUserService.js';
import { PasswordService } from '../src/services/passwordService.js';

const jwt = {
  secret: 'test-secret-that-is-at-least-32-bytes-long',
  issuer: 'ant-design-pro-auth-server',
  audience: 'ant-design-pro-web',
  expiresInSeconds: 7200,
};

class MemoryUserRepository implements UserRepositoryPort {
  private readonly users = new Map<string, AuthenticationUser>();
  private readonly organizationAccess = new Map<string, Set<string>>();
  private nextId = 1;

  async createUser(input: CreateUserInput): Promise<RegisteredUser> {
    const duplicate = [...this.users.values()].find(
      (user) => user.username === input.username || user.email === input.email,
    );
    if (duplicate) {
      const field = duplicate.email === input.email ? 'email' : 'username';
      throw new AppError({
        statusCode: 409,
        errorCode: 'ACCOUNT_ALREADY_EXISTS',
        errorMessage: field === 'email' ? '邮箱已存在' : '用户名已存在',
        details: { field },
      });
    }

    const userId = `user-${this.nextId++}`;
    this.users.set(userId, {
      userId,
      username: input.username,
      email: input.email,
      name: input.name,
      avatar: null,
      status: 'active',
      isSuperAdmin: false,
      defaultOrganizationId: null,
      tokenVersion: 0,
      passwordHash: input.passwordHash,
    });
    return {
      userId,
      username: input.username,
      email: input.email,
      name: input.name,
      status: 'active',
    };
  }

  async findAuthenticationUserByAccount(
    account: string,
  ): Promise<AuthenticationUser | null> {
    return (
      [...this.users.values()].find(
        (user) => user.username === account || user.email === account,
      ) ?? null
    );
  }

  async findAuthenticationUserById(
    userId: string,
  ): Promise<AuthenticationUser | null> {
    return this.users.get(userId) ?? null;
  }

  async getCurrentUser(userId: string): Promise<AuthCurrentUser | null> {
    const user = this.users.get(userId);
    if (!user) {
      return null;
    }
    const organizationIds = [
      ...(this.organizationAccess.get(userId) ?? new Set<string>()),
    ];
    const organizations = organizationIds.map((organizationId) => ({
      organizationId,
      organizationCode: organizationId,
      organizationName: organizationId,
      permissions: [],
      skillCodes: [],
      dataScopes: [] as [],
      defaultDataScopeId: null,
    }));
    return {
      userId: user.userId,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
      email: user.email,
      status: user.status,
      isSuperAdmin: user.isSuperAdmin,
      platformPermissions: [],
      platformSkillCodes: [],
      defaultOrganizationId: organizationIds.includes(
        user.defaultOrganizationId ?? '',
      )
        ? user.defaultOrganizationId
        : null,
      organizations,
    };
  }

  async setDefaultOrganization(
    userId: string,
    organizationId: string,
  ): Promise<SetDefaultOrganizationResult> {
    const user = this.users.get(userId);
    const accessibleOrganizations = this.organizationAccess.get(userId);
    if (
      user?.status !== 'active' ||
      !accessibleOrganizations?.has(organizationId)
    ) {
      return 'organization_forbidden';
    }
    this.users.set(userId, { ...user, defaultOrganizationId: organizationId });
    return 'updated';
  }

  getStoredUser(userId: string): AuthenticationUser {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`Missing test user ${userId}`);
    }
    return user;
  }

  updateUser(userId: string, changes: Partial<AuthenticationUser>): void {
    const user = this.getStoredUser(userId);
    this.users.set(userId, { ...user, ...changes });
  }

  grantOrganizationAccess(userId: string, organizationId: string): void {
    const organizations =
      this.organizationAccess.get(userId) ?? new Set<string>();
    organizations.add(organizationId);
    this.organizationAccess.set(userId, organizations);
  }
}

function createTestContext() {
  const users = new MemoryUserRepository();
  const passwords = new PasswordService();
  const tokens = new AccessTokenService(jwt);
  const authService = new AuthService(users, passwords, tokens);
  const currentUserService = new CurrentUserService(users);
  const authenticate = createAuthenticationMiddleware(tokens, users);
  const app = express();

  app.use(traceId);
  app.use(express.json());
  app.use('/api', createAuthRouter(authService));
  app.use('/api/login/outLogin', createLogoutRouter(authenticate));
  app.use(
    '/api/currentUser',
    createCurrentUserRouter(authenticate, currentUserService),
  );
  app.use(
    '/api/users',
    createUserPreferencesRouter(authenticate, currentUserService),
  );
  app.use(errorHandler);

  return { app, users, passwords };
}

const registration = {
  username: 'Alice.User',
  email: 'Alice@Example.com',
  name: 'Alice',
  password: 'correct horse battery staple',
};

describe('authentication flow', () => {
  let context: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    context = createTestContext();
  });

  it('registers, hashes the password, logs in, and returns currentUser', async () => {
    const registered = await request(context.app)
      .post('/api/register')
      .send(registration);

    expect(registered.status).toBe(201);
    expect(registered.body.data).toMatchObject({
      userId: 'user-1',
      username: 'alice.user',
      email: 'alice@example.com',
      name: 'Alice',
      status: 'active',
    });
    const stored = context.users.getStoredUser('user-1');
    expect(stored.passwordHash).not.toBe(registration.password);
    await expect(
      context.passwords.verify(stored.passwordHash, registration.password),
    ).resolves.toBe(true);

    const login = await request(context.app).post('/api/login/account').send({
      account: 'ALICE@EXAMPLE.COM',
      password: registration.password,
    });
    expect(login.status).toBe(200);
    expect(login.headers['cache-control']).toBe('no-store');
    expect(login.body.data).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 7200,
    });

    const currentUser = await request(context.app)
      .get('/api/currentUser')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(currentUser.status).toBe(200);
    expect(currentUser.body.data).toMatchObject({
      userId: 'user-1',
      username: 'alice.user',
      isSuperAdmin: false,
      platformPermissions: [],
      platformSkillCodes: [],
      defaultOrganizationId: null,
      organizations: [],
    });
  });

  it('authenticates logout and explicitly reports that revocation is pending', async () => {
    await request(context.app).post('/api/register').send(registration);
    const login = await request(context.app).post('/api/login/account').send({
      account: registration.email,
      password: registration.password,
    });

    const missingToken = await request(context.app).post('/api/login/outLogin');
    const acknowledged = await request(context.app)
      .post('/api/login/outLogin')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);

    expect(missingToken.status).toBe(401);
    expect(missingToken.body.errorCode).toBe('ACCESS_TOKEN_MISSING');
    expect(acknowledged.status).toBe(200);
    expect(acknowledged.body.data).toEqual({
      loggedOut: true,
      serverTokenRevoked: false,
    });
  });

  it('persists only an Organization the authenticated user can enter', async () => {
    const allowedOrganizationId = '11111111-1111-4111-8111-111111111111';
    const forbiddenOrganizationId = '22222222-2222-4222-8222-222222222222';
    await request(context.app).post('/api/register').send(registration);
    context.users.grantOrganizationAccess('user-1', allowedOrganizationId);
    const login = await request(context.app).post('/api/login/account').send({
      account: registration.username,
      password: registration.password,
    });
    const authorization = `Bearer ${login.body.data.accessToken}`;

    const forbidden = await request(context.app)
      .put('/api/users/me/default-organization')
      .set('Authorization', authorization)
      .send({ organizationId: forbiddenOrganizationId });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.errorCode).toBe('ORGANIZATION_FORBIDDEN');

    const updated = await request(context.app)
      .put('/api/users/me/default-organization')
      .set('Authorization', authorization)
      .send({ organizationId: allowedOrganizationId });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toEqual({
      defaultOrganizationId: allowedOrganizationId,
    });

    const currentUser = await request(context.app)
      .get('/api/currentUser')
      .set('Authorization', authorization);
    expect(currentUser.body.data.defaultOrganizationId).toBe(
      allowedOrganizationId,
    );
  });

  it('authenticates and validates the default Organization command', async () => {
    await request(context.app).post('/api/register').send(registration);
    const login = await request(context.app).post('/api/login/account').send({
      account: registration.username,
      password: registration.password,
    });

    const missingToken = await request(context.app)
      .put('/api/users/me/default-organization')
      .send({
        organizationId: '11111111-1111-4111-8111-111111111111',
      });
    expect(missingToken.status).toBe(401);
    expect(missingToken.body.errorCode).toBe('ACCESS_TOKEN_MISSING');

    const invalidBody = await request(context.app)
      .put('/api/users/me/default-organization')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .send({ organizationId: 'not-a-uuid', userId: 'user-2' });
    expect(invalidBody.status).toBe(400);
    expect(invalidBody.body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('returns the documented conflict for duplicate accounts', async () => {
    await request(context.app).post('/api/register').send(registration);
    const response = await request(context.app)
      .post('/api/register')
      .send({
        ...registration,
        username: 'another-user',
      });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      success: false,
      errorCode: 'ACCOUNT_ALREADY_EXISTS',
      details: { field: 'email' },
    });
  });

  it('rejects weak payloads and legacy extra fields', async () => {
    const response = await request(context.app)
      .post('/api/register')
      .send({ ...registration, password: 'short', confirm: 'short' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      errorCode: 'VALIDATION_ERROR',
    });
    expect(response.body.details.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
        expect.objectContaining({ field: 'body', message: '包含未允许的字段' }),
      ]),
    );
  });

  it('uses the same login error for wrong passwords and disabled users', async () => {
    await request(context.app).post('/api/register').send(registration);
    const wrongPassword = await request(context.app)
      .post('/api/login/account')
      .send({
        account: 'alice.user',
        password: 'this is the wrong password',
      });

    context.users.updateUser('user-1', { status: 'disabled' });
    const disabled = await request(context.app)
      .post('/api/login/account')
      .send({
        account: 'alice.user',
        password: registration.password,
      });

    expect(wrongPassword.status).toBe(401);
    expect(disabled.status).toBe(401);
    expect(wrongPassword.body.errorCode).toBe('BAD_CREDENTIALS');
    expect(disabled.body.errorCode).toBe('BAD_CREDENTIALS');
    expect(disabled.body.errorMessage).toBe(wrongPassword.body.errorMessage);
  });

  it('rejects missing, damaged, and tokenVersion-invalidated tokens', async () => {
    await request(context.app).post('/api/register').send(registration);
    const login = await request(context.app).post('/api/login/account').send({
      account: 'alice.user',
      password: registration.password,
    });

    const missing = await request(context.app).get('/api/currentUser');
    const damaged = await request(context.app)
      .get('/api/currentUser')
      .set('Authorization', 'Bearer damaged-token');
    context.users.updateUser('user-1', { tokenVersion: 1 });
    const invalidated = await request(context.app)
      .get('/api/currentUser')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);

    expect(missing.body.errorCode).toBe('ACCESS_TOKEN_MISSING');
    expect(damaged.body.errorCode).toBe('ACCESS_TOKEN_INVALID');
    expect(invalidated.body.errorCode).toBe('ACCESS_TOKEN_INVALID');
  });
});
