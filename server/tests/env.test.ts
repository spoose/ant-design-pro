import { describe, expect, it } from 'vitest';
import { loadServerEnv } from '../src/config/env.js';

const validEnv = {
  NODE_ENV: 'test',
  PORT: '3000',
  CORS_ORIGINS: 'http://localhost:8000,https://admin.example.com',
  MYSQL_HOST: '127.0.0.1',
  MYSQL_PORT: '3306',
  MYSQL_DATABASE: 'ant_design_pro_test',
  MYSQL_USER: 'test_user',
  MYSQL_PASSWORD: 'test_password',
  MYSQL_CONNECTION_LIMIT: '5',
  JWT_SECRET: 'test-secret-that-is-at-least-32-bytes-long',
  JWT_ISSUER: 'ant-design-pro-auth-server',
  JWT_AUDIENCE: 'ant-design-pro-web',
  JWT_EXPIRES_IN_SECONDS: '7200',
};

describe('loadServerEnv', () => {
  it('parses an explicit valid configuration', () => {
    expect(loadServerEnv(validEnv)).toEqual({
      nodeEnv: 'test',
      port: 3000,
      corsOrigins: ['http://localhost:8000', 'https://admin.example.com'],
      database: {
        host: '127.0.0.1',
        port: 3306,
        database: 'ant_design_pro_test',
        user: 'test_user',
        password: 'test_password',
        connectionLimit: 5,
      },
      jwt: {
        secret: 'test-secret-that-is-at-least-32-bytes-long',
        issuer: 'ant-design-pro-auth-server',
        audience: 'ant-design-pro-web',
        expiresInSeconds: 7200,
      },
    });
  });

  it('fails when a required database value is missing', () => {
    expect(() => loadServerEnv({ ...validEnv, MYSQL_HOST: undefined })).toThrow(
      '缺少必需环境变量：MYSQL_HOST',
    );
  });

  it('rejects a CORS URL containing a path', () => {
    expect(() =>
      loadServerEnv({
        ...validEnv,
        CORS_ORIGINS: 'https://admin.example.com/path',
      }),
    ).toThrow('CORS_ORIGINS 必须是完整的 HTTP(S) 来源');
  });

  it('rejects a short JWT secret instead of using a fallback', () => {
    expect(() =>
      loadServerEnv({ ...validEnv, JWT_SECRET: 'too-short' }),
    ).toThrow('环境变量 JWT_SECRET 至少需要 32 字节');
  });

  it('rejects the example JWT secret placeholder', () => {
    expect(() =>
      loadServerEnv({
        ...validEnv,
        JWT_SECRET: 'replace-with-at-least-32-random-bytes',
      }),
    ).toThrow('环境变量 JWT_SECRET 不能使用示例占位值');
  });
});
