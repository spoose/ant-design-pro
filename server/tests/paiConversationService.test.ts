import { describe, expect, it, vi } from 'vitest';
import type {
  PaiAgentEvent,
  PaiAgentService,
} from '../src/ai/services/paiAgentService.js';
import { AppError } from '../src/errors/appError.js';
import type {
  PaiConversationHistory,
  PaiConversationRepositoryPort,
} from '../src/repositories/paiConversationRepository.js';
import { PaiConversationService } from '../src/services/paiConversationService.js';

const ownerUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const conversationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const runId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const now = new Date('2026-08-05T08:00:00.000Z');
type AgentStream = Pick<PaiAgentService, 'stream'>['stream'];

async function* events(
  values: readonly PaiAgentEvent[],
): AsyncGenerator<PaiAgentEvent> {
  yield* values;
}

function createHistory(): PaiConversationHistory {
  return {
    conversation: {
      conversationId,
      ownerUserId,
      scope: { type: 'platform' },
      title: '测试会话',
      createdAt: now,
      updatedAt: now,
    },
    turns: [
      {
        runId: '11111111-1111-4111-8111-111111111111',
        turnNo: 1,
        status: 'completed',
        errorCode: null,
        knowledgeEnabled: false,
        webSearchEnabled: false,
        modelProvider: 'deepseek',
        modelName: 'deepseek-chat',
        startedAt: now,
        completedAt: now,
        messages: [
          {
            messageId: '21111111-1111-4111-8111-111111111111',
            role: 'user',
            status: 'completed',
            content: '已完成问题',
            createdAt: now,
            completedAt: now,
            sources: [],
          },
          {
            messageId: '31111111-1111-4111-8111-111111111111',
            role: 'assistant',
            status: 'completed',
            content: '已完成回答',
            createdAt: now,
            completedAt: now,
            sources: [],
          },
        ],
      },
      {
        runId: '41111111-1111-4111-8111-111111111111',
        turnNo: 2,
        status: 'failed',
        errorCode: 'AI_MODEL_UNAVAILABLE',
        knowledgeEnabled: false,
        webSearchEnabled: false,
        modelProvider: 'deepseek',
        modelName: 'deepseek-chat',
        startedAt: now,
        completedAt: now,
        messages: [
          {
            messageId: '51111111-1111-4111-8111-111111111111',
            role: 'user',
            status: 'completed',
            content: '失败问题',
            createdAt: now,
            completedAt: now,
            sources: [],
          },
          {
            messageId: '61111111-1111-4111-8111-111111111111',
            role: 'assistant',
            status: 'failed',
            content: '不完整回答',
            createdAt: now,
            completedAt: now,
            sources: [],
          },
        ],
      },
    ],
  };
}

function createRepository(
  overrides: Partial<PaiConversationRepositoryPort> = {},
): PaiConversationRepositoryPort {
  return {
    create: vi.fn(),
    list: vi.fn(),
    updateTitle: vi.fn(),
    getHistory: vi.fn().mockResolvedValue(createHistory()),
    delete: vi.fn(),
    startRun: vi.fn().mockResolvedValue({
      kind: 'started',
      run: {
        runId,
        turnNo: 3,
        userMessageId: '71111111-1111-4111-8111-111111111111',
        assistantMessageId: '81111111-1111-4111-8111-111111111111',
        status: 'streaming',
      },
    }),
    saveAssistantContent: vi.fn().mockResolvedValue('saved'),
    completeRun: vi.fn().mockResolvedValue('completed'),
    ...overrides,
  };
}

function createService(
  repository: PaiConversationRepositoryPort,
  stream: AgentStream,
) {
  return new PaiConversationService({
    repository,
    agentService: { stream },
    articlesDirectory: '/knowledge-not-read',
    modelConfigured: true,
    modelProvider: 'deepseek',
    modelName: 'deepseek-chat',
  });
}

describe('PaiConversationService', () => {
  it('sends only completed history and persists the final assistant answer', async () => {
    const repository = createRepository();
    const stream = vi.fn<AgentStream>().mockResolvedValue(
      events([
        { type: 'reasoning-delta', text: '内部推理' },
        { type: 'text-delta', text: '第一段' },
        {
          type: 'sources',
          sources: [
            {
              sourceId: 'web-1',
              sourceType: 'web',
              title: '公开来源',
              sourceUrl: 'https://example.test/source',
            },
          ],
        },
        { type: 'text-delta', text: '第二段' },
      ]),
    );
    const service = createService(repository, stream);
    const controller = new AbortController();

    const session = await service.startTurn({
      ownerUserId,
      conversationId,
      idempotencyKey: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      content: '当前问题',
      knowledgeEnabled: false,
      webSearchEnabled: true,
      traceId: 'trace-1',
      abortSignal: controller.signal,
    });
    const streamed = [];
    for await (const event of session.events) streamed.push(event);

    expect(stream).toHaveBeenCalledWith(
      [
        { role: 'user', content: '已完成问题' },
        { role: 'assistant', content: '已完成回答' },
        { role: 'user', content: '当前问题' },
      ],
      { abortSignal: controller.signal, webSearchEnabled: true },
    );
    expect(streamed[0]).toEqual({
      type: 'reasoning-delta',
      text: '内部推理',
    });
    expect(repository.completeRun).toHaveBeenCalledWith({
      runId,
      status: 'completed',
      content: '第一段第二段',
      sources: [
        {
          sourceId: 'web-1',
          sourceType: 'web',
          title: '公开来源',
          sourceUrl: 'https://example.test/source',
          snippet: null,
          publishedAt: null,
          sourceUpdatedAt: null,
        },
      ],
    });
  });

  it('stores partial content as aborted when the client closes the stream', async () => {
    const repository = createRepository();
    const controller = new AbortController();
    const stream = vi.fn<AgentStream>().mockResolvedValue(
      (async function* (): AsyncGenerator<PaiAgentEvent> {
        yield { type: 'text-delta', text: '部分回答' };
        controller.abort();
        throw new Error('stream aborted');
      })(),
    );
    const service = createService(repository, stream);
    const session = await service.startTurn({
      ownerUserId,
      conversationId,
      idempotencyKey: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      content: '当前问题',
      knowledgeEnabled: false,
      webSearchEnabled: false,
      traceId: 'trace-2',
      abortSignal: controller.signal,
    });

    const consume = async () => {
      for await (const _event of session.events) {
        // Consume the stream to trigger its terminal state.
      }
    };
    await expect(consume()).rejects.toMatchObject({
      errorCode: 'CLIENT_ABORTED',
    });
    expect(repository.completeRun).toHaveBeenCalledWith({
      runId,
      status: 'aborted',
      content: '部分回答',
      errorCode: 'CLIENT_ABORTED',
      sources: [],
    });
  });

  it('replays a terminal run without calling the model again', async () => {
    const history = createHistory();
    const completedTurn = history.turns[0];
    const userMessage = completedTurn?.messages[0];
    const assistantMessage = completedTurn?.messages[1];
    if (!completedTurn || !userMessage || !assistantMessage) {
      throw new Error('Replay fixture is incomplete');
    }
    history.turns = [
      {
        ...completedTurn,
        runId,
      },
    ];
    const repository = createRepository({
      getHistory: vi.fn().mockResolvedValue(history),
      startRun: vi.fn().mockResolvedValue({
        kind: 'replayed',
        run: {
          runId,
          turnNo: 1,
          userMessageId: userMessage.messageId,
          assistantMessageId: assistantMessage.messageId,
          status: 'completed',
        },
      }),
    });
    const stream = vi.fn<AgentStream>();
    const service = createService(repository, stream);

    const session = await service.startTurn({
      ownerUserId,
      conversationId,
      idempotencyKey: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      content: '重复请求',
      knowledgeEnabled: false,
      webSearchEnabled: false,
      traceId: 'trace-3',
      abortSignal: new AbortController().signal,
    });
    const replayed = [];
    for await (const event of session.events) replayed.push(event);

    expect(session.replayed).toBe(true);
    expect(replayed).toEqual([{ type: 'text-delta', text: '已完成回答' }]);
    expect(stream).not.toHaveBeenCalled();
  });

  it('checks model configuration before creating a Run', async () => {
    const repository = createRepository();
    const service = new PaiConversationService({
      repository,
      agentService: { stream: vi.fn<AgentStream>() },
      articlesDirectory: '/knowledge-not-read',
      modelConfigured: false,
      modelProvider: 'deepseek',
      modelName: 'deepseek-chat',
    });

    await expect(
      service.startTurn({
        ownerUserId,
        conversationId,
        idempotencyKey: '99999999-9999-4999-8999-999999999999',
        content: '问题',
        knowledgeEnabled: false,
        webSearchEnabled: false,
        traceId: 'trace-4',
        abortSignal: new AbortController().signal,
      }),
    ).rejects.toBeInstanceOf(AppError);
    expect(repository.startRun).not.toHaveBeenCalled();
  });
});
