import type { Pool } from 'mysql2/promise';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';

const jwt = {
  secret: 'test-secret-that-is-at-least-32-bytes-long',
  issuer: 'ant-design-pro-auth-server',
  audience: 'ant-design-pro-web',
  expiresInSeconds: 7200,
};

const deepseek = {
  apiKey: 'test-deepseek-key',
  model: 'deepseek-v4-flash',
};

const firecrawl = {};

function createPool(query: ReturnType<typeof vi.fn>): Pool {
  return { query } as unknown as Pool;
}

describe('health routes and errors', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports the process as alive without querying MySQL', async () => {
    const query = vi.fn();
    const response = await request(
      createApp({
        pool: createPool(query),
        nodeEnv: 'test',
        corsOrigins: ['http://localhost:8000'],
        jwt,
        deepseek,
        firecrawl,
      }),
    ).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: 'alive' },
    });
    expect(response.body.traceId).toBe(response.headers['x-trace-id']);
    expect(query).not.toHaveBeenCalled();
  });

  it('reports readiness after a successful MySQL query', async () => {
    const query = vi.fn().mockResolvedValue([[], []]);
    const response = await request(
      createApp({
        pool: createPool(query),
        nodeEnv: 'test',
        corsOrigins: ['http://localhost:8000'],
        jwt,
        deepseek,
        firecrawl,
      }),
    ).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: 'ready' },
    });
    expect(query).toHaveBeenCalledWith('SELECT 1 AS ok');
  });

  it('returns an explicit 503 when MySQL is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const query = vi.fn().mockRejectedValue(new Error('connection refused'));
    const response = await request(
      createApp({
        pool: createPool(query),
        nodeEnv: 'test',
        corsOrigins: ['http://localhost:8000'],
        jwt,
        deepseek,
        firecrawl,
      }),
    ).get('/health/ready');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      errorCode: 'DATABASE_UNAVAILABLE',
      errorMessage: '数据库不可用',
    });
    expect(response.body.traceId).toBe(response.headers['x-trace-id']);
  });

  it('uses the standard error envelope for unknown routes', async () => {
    const response = await request(
      createApp({
        pool: createPool(vi.fn()),
        nodeEnv: 'test',
        corsOrigins: ['http://localhost:8000'],
        jwt,
        deepseek,
        firecrawl,
      }),
    ).get('/not-found');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      errorCode: 'ROUTE_NOT_FOUND',
      errorMessage: '接口不存在',
    });
  });

  it('rejects malformed JSON with a safe explicit error', async () => {
    const response = await request(
      createApp({
        pool: createPool(vi.fn()),
        nodeEnv: 'test',
        corsOrigins: ['http://localhost:8000'],
        jwt,
        deepseek,
        firecrawl,
      }),
    )
      .post('/not-found')
      .set('Content-Type', 'application/json')
      .send('{"invalid"');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      errorCode: 'INVALID_JSON',
      errorMessage: '请求体不是有效的 JSON',
    });
  });
});
