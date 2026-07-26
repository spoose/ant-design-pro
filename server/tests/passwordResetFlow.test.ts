import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { traceId } from '../src/middleware/traceId.js';
import type {
  PasswordResetRepositoryPort,
  PasswordResetUser,
} from '../src/repositories/passwordResetRepository.js';
import { createPasswordResetRouter } from '../src/routes/passwordReset.js';
import { PasswordResetService } from '../src/services/passwordResetService.js';
import { PasswordService } from '../src/services/passwordService.js';

class MemoryPasswordResetRepository implements PasswordResetRepositoryPort {
  readonly user: PasswordResetUser = {
    userId: 'user-1',
    email: 'alice@example.com',
  };
  tokenHash: Buffer | undefined;
  expiresAt: Date | undefined;
  used = false;
  passwordHash = '';
  tokenVersion = 0;

  async findActiveUserByEmail(
    email: string,
  ): Promise<PasswordResetUser | null> {
    return email === this.user.email ? this.user : null;
  }

  async replaceToken(
    userId: string,
    tokenHash: Buffer,
    expiresAt: Date,
  ): Promise<void> {
    if (userId !== this.user.userId) throw new Error('unexpected user');
    this.tokenHash = tokenHash;
    this.expiresAt = expiresAt;
    this.used = false;
  }

  async consumeToken(
    tokenHash: Buffer,
    passwordHash: string,
    consumedAt: Date,
  ): Promise<boolean> {
    if (
      !this.tokenHash?.equals(tokenHash) ||
      !this.expiresAt ||
      this.expiresAt.getTime() <= consumedAt.getTime() ||
      this.used
    ) {
      return false;
    }
    this.used = true;
    this.passwordHash = passwordHash;
    this.tokenVersion += 1;
    return true;
  }
}

function createTestApp(
  repository: PasswordResetRepositoryPort,
  mode: 'development-response' | 'delivery-unavailable',
) {
  const passwords = new PasswordService();
  const service = new PasswordResetService(repository, passwords, mode);
  const app = express();
  app.use(traceId);
  app.use(express.json());
  app.use('/api/password', createPasswordResetRouter(service));
  app.use(errorHandler);
  return { app, passwords };
}

describe('password reset flow', () => {
  let repository: MemoryPasswordResetRepository;

  beforeEach(() => {
    repository = new MemoryPasswordResetRepository();
  });

  it('issues a hashed one-time token and resets the password once', async () => {
    const { app, passwords } = createTestApp(
      repository,
      'development-response',
    );
    const requested = await request(app)
      .post('/api/password/forgot')
      .send({ email: 'ALICE@EXAMPLE.COM' });

    expect(requested.status).toBe(202);
    expect(requested.headers['cache-control']).toBe('no-store');
    expect(requested.body.data).toMatchObject({ accepted: true });
    expect(requested.body.data.developmentResetToken).toHaveLength(43);
    expect(repository.tokenHash).toHaveLength(32);
    expect(repository.tokenHash?.toString('utf8')).not.toContain(
      requested.body.data.developmentResetToken,
    );

    const newPassword = 'a different secure password';
    const reset = await request(app).post('/api/password/reset').send({
      token: requested.body.data.developmentResetToken,
      password: newPassword,
    });
    expect(reset.status).toBe(200);
    expect(reset.body.data).toEqual({ reset: true });
    expect(repository.tokenVersion).toBe(1);
    await expect(
      passwords.verify(repository.passwordHash, newPassword),
    ).resolves.toBe(true);

    const reused = await request(app).post('/api/password/reset').send({
      token: requested.body.data.developmentResetToken,
      password: 'yet another secure password',
    });
    expect(reused.status).toBe(400);
    expect(reused.body.errorCode).toBe('PASSWORD_RESET_TOKEN_INVALID');
  });

  it('does not reveal whether an email exists at the request step', async () => {
    const { app } = createTestApp(repository, 'development-response');
    const response = await request(app)
      .post('/api/password/forgot')
      .send({ email: 'missing@example.com' });

    expect(response.status).toBe(202);
    expect(response.body.data).toMatchObject({ accepted: true });
    expect(response.body.data.developmentResetToken).toHaveLength(43);
    expect(repository.tokenHash).toBeUndefined();
  });

  it('fails explicitly when production delivery is unavailable', async () => {
    const { app } = createTestApp(repository, 'delivery-unavailable');
    const response = await request(app)
      .post('/api/password/forgot')
      .send({ email: 'alice@example.com' });

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      errorCode: 'PASSWORD_RESET_DELIVERY_UNAVAILABLE',
    });
    expect(repository.tokenHash).toBeUndefined();
  });

  it('rejects legacy and malformed payloads', async () => {
    const { app } = createTestApp(repository, 'development-response');
    const response = await request(app)
      .post('/api/password/forgot')
      .send({ email: 'invalid', account: 'alice' });

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe('VALIDATION_ERROR');
  });
});
