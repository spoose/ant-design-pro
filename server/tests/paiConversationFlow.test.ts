import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { PaiAgentEvent } from '../src/ai/services/paiAgentService.js';
import { AppError } from '../src/errors/appError.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { traceId } from '../src/middleware/traceId.js';
import { createPaiConversationsRouter } from '../src/routes/paiConversations.js';
import type { PaiConversationServicePort } from '../src/services/paiConversationService.js';

const ownerUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const conversationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const runId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const now = new Date('2026-08-05T08:00:00.000Z');

async function* events(
  values: readonly PaiAgentEvent[],
): AsyncGenerator<PaiAgentEvent> {
  yield* values;
}

function createService(
  overrides: Partial<PaiConversationServicePort> = {},
): PaiConversationServicePort {
  const conversation = {
    conversationId,
    ownerUserId,
    scope: { type: 'platform' as const },
    title: '测试会话',
    createdAt: now,
    updatedAt: now,
  };
  return {
    create: vi.fn().mockResolvedValue(conversation),
    list: vi.fn().mockResolvedValue([conversation]),
    updateTitle: vi.fn().mockResolvedValue({
      ...conversation,
      title: '新标题',
    }),
    getHistory: vi.fn().mockResolvedValue({ conversation, turns: [] }),
    delete: vi.fn().mockResolvedValue({ deleted: true }),
    startTurn: vi.fn().mockResolvedValue({
      run: {
        runId,
        turnNo: 1,
        userMessageId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        assistantMessageId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        status: 'streaming',
      },
      replayed: false,
      events: events([{ type: 'text-delta', text: '流式回答' }]),
    }),
    ...overrides,
  };
}

function createTestApp(service: PaiConversationServicePort) {
  const app = express();
  app.use(traceId);
  app.use(express.json());
  app.use((_request, response, next) => {
    response.locals.authenticatedUserId = ownerUserId;
    next();
  });
  app.use('/api/pai/conversations', createPaiConversationsRouter(service));
  app.use(errorHandler);
  return app;
}

describe('pAI conversation routes', () => {
  it('does not expose the removed stateless chat endpoint', async () => {
    const response = await request(createTestApp(createService()))
      .post('/api/pai/chat/completions')
      .send({ messages: [{ role: 'user', content: '旧请求' }] });

    expect(response.status).toBe(404);
  });

  it('uses the authenticated user for conversation CRUD', async () => {
    const service = createService();
    const app = createTestApp(service);

    const created = await request(app).post('/api/pai/conversations').send({
      scopeType: 'platform',
      title: '测试会话',
    });
    const listed = await request(app).get(
      '/api/pai/conversations?scopeType=platform&limit=20',
    );
    const history = await request(app).get(
      `/api/pai/conversations/${conversationId}`,
    );
    const renamed = await request(app)
      .patch(`/api/pai/conversations/${conversationId}`)
      .send({ title: '新标题' });
    const deleted = await request(app).delete(
      `/api/pai/conversations/${conversationId}`,
    );

    expect(created.status).toBe(201);
    expect(listed.status).toBe(200);
    expect(history.status).toBe(200);
    expect(renamed.status).toBe(200);
    expect(deleted.status).toBe(200);
    expect(service.create).toHaveBeenCalledWith({
      ownerUserId,
      scope: { type: 'platform' },
      title: '测试会话',
    });
    expect(service.getHistory).toHaveBeenCalledWith(
      ownerUserId,
      conversationId,
    );
    expect(service.updateTitle).toHaveBeenCalledWith(
      ownerUserId,
      conversationId,
      '新标题',
    );
    expect(service.delete).toHaveBeenCalledWith(ownerUserId, conversationId);
  });

  it('streams run metadata, model events, and the terminal state', async () => {
    const service = createService();
    const response = await request(createTestApp(service))
      .post(`/api/pai/conversations/${conversationId}/runs`)
      .send({
        idempotencyKey: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        content: '当前问题',
        webSearchEnabled: true,
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.text).toContain('event: run');
    expect(response.text).toContain(`"runId":"${runId}"`);
    expect(response.text).toContain(
      'event: text-delta\ndata: {"text":"流式回答"}',
    );
    expect(response.text).toContain(
      `event: done\ndata: {"runId":"${runId}","status":"completed"}`,
    );
    expect(service.startTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId,
        conversationId,
        content: '当前问题',
        knowledgeEnabled: false,
        webSearchEnabled: true,
        abortSignal: expect.any(AbortSignal),
      }),
    );
  });

  it('returns a typed SSE error after streaming has started', async () => {
    const service = createService({
      startTurn: vi.fn().mockResolvedValue({
        run: {
          runId,
          turnNo: 1,
          userMessageId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          assistantMessageId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          status: 'streaming',
        },
        replayed: false,
        events: (async function* (): AsyncGenerator<PaiAgentEvent> {
          yield { type: 'text-delta', text: '部分回答' };
          throw new AppError({
            statusCode: 502,
            errorCode: 'AI_MODEL_UNAVAILABLE',
            errorMessage: '模型服务暂时不可用',
          });
        })(),
      }),
    });

    const response = await request(createTestApp(service))
      .post(`/api/pai/conversations/${conversationId}/runs`)
      .send({
        idempotencyKey: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        content: '当前问题',
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain('event: error');
    expect(response.text).toContain('AI_MODEL_UNAVAILABLE');
    expect(response.text).not.toContain('event: done');
  });
});
