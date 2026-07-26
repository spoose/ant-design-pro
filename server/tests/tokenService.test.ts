import { describe, expect, it } from 'vitest';
import { AccessTokenService } from '../src/services/accessTokenService.js';

const config = {
  secret: 'test-secret-that-is-at-least-32-bytes-long',
  issuer: 'ant-design-pro-auth-server',
  audience: 'ant-design-pro-web',
  expiresInSeconds: 7200,
};

describe('AccessTokenService', () => {
  it('signs and verifies the required access token claims', async () => {
    const service = new AccessTokenService(config);
    const issued = await service.issue({ userId: 'user-1', tokenVersion: 3 });
    const claims = await service.verify(issued.accessToken);

    expect(issued.tokenType).toBe('Bearer');
    expect(issued.expiresIn).toBe(7200);
    expect(claims).toMatchObject({ userId: 'user-1', tokenVersion: 3 });
    expect(issued.expiresAt).toMatch(/Z$/);
  });

  it('rejects a damaged token', async () => {
    const service = new AccessTokenService(config);
    await expect(service.verify('not-a-jwt')).rejects.toMatchObject({
      errorCode: 'ACCESS_TOKEN_INVALID',
      statusCode: 401,
    });
  });

  it('distinguishes an expired token from other invalid tokens', async () => {
    const service = new AccessTokenService({ ...config, expiresInSeconds: -1 });
    const issued = await service.issue({ userId: 'user-1', tokenVersion: 0 });

    await expect(service.verify(issued.accessToken)).rejects.toMatchObject({
      errorCode: 'ACCESS_TOKEN_EXPIRED',
      statusCode: 401,
    });
  });
});
