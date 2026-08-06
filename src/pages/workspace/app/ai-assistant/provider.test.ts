/**
 * Provider 协议测试：
 * 覆盖会话 Run URL、登录凭证、最小出站请求和 pAI SSE 事件合并。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '@/utils/authToken';
import {
  createPaiChatProvider,
  createPaiRequestFallback,
  findRetryQuestion,
} from './provider';

const responseHeaders = new Headers({
  'content-type': 'text/event-stream',
});

const createChunk = (
  event: 'reasoning-delta' | 'text-delta',
  text: string,
) => ({
  event,
  data: JSON.stringify({ text }),
});

describe('pAI chat provider', () => {
  afterEach(() => {
    setAccessToken();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('targets the selected conversation and attaches the login token', () => {
    setAccessToken('access-token');

    const provider = createPaiChatProvider('conversation/1');

    expect(provider.request.baseURL).toBe(
      '/api/pai/conversations/conversation%2F1/runs',
    );
    expect(provider.request.options.headers).toEqual({
      Authorization: 'Bearer access-token',
    });
    expect(provider.request.options.params).toBeUndefined();
    expect(provider.request.options.fetch).toBeTypeOf('function');
  });

  it('reconnects once the browser can reach the backend again', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('ok'));
    const requestFetch =
      createPaiChatProvider('conversation-1').request.options.fetch;

    const pendingResponse = requestFetch?.('/api/pai/conversations/1/runs', {});
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(pendingResponse).resolves.toBeInstanceOf(Response);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the backend failure message without reconnecting an ended run', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          errorCode: 'AI_MODEL_UNAVAILABLE',
          errorMessage: '模型服务暂时不可用',
        }),
        { status: 502 },
      ),
    );
    const requestFetch =
      createPaiChatProvider('conversation-1').request.options.fetch;

    await expect(
      requestFetch?.('/api/pai/conversations/1/runs', {}),
    ).rejects.toMatchObject({
      name: 'AI_MODEL_UNAVAILABLE',
      message: '模型服务暂时不可用',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('puts the final transport error on the assistant bubble', () => {
    const fallback = createPaiRequestFallback(
      {},
      {
        error: new Error('无法连接后端服务'),
        messageInfo: {
          id: 'assistant-1',
          status: 'loading',
          message: { role: 'assistant', content: '' },
        },
      },
    );

    expect(fallback).toEqual({
      role: 'assistant',
      content: '',
      terminalStatus: 'failed',
      errorMessage: '无法连接后端服务',
    });
  });

  it('finds the user question immediately preceding a failed answer', () => {
    expect(
      findRetryQuestion(
        [
          {
            id: 'user-1',
            status: 'local',
            message: { role: 'user', content: '重新检查这个问题' },
          },
          {
            id: 'assistant-1',
            status: 'error',
            message: {
              role: 'assistant',
              content: '',
              terminalStatus: 'failed',
              errorMessage: '模型服务暂时不可用',
            },
          },
        ],
        1,
      ),
    ).toBe('重新检查这个问题');
  });

  it('sends only the current user input, idempotency key and capabilities', () => {
    const provider = createPaiChatProvider('conversation-1');

    const params = provider.transformParams(
      {
        idempotencyKey: 'run-request-1',
        knowledgeEnabled: true,
        webSearchEnabled: true,
        messages: [{ role: 'user', content: '  请检查最新资料  ' }],
      },
      provider.request.options,
    );

    expect(params).toEqual({
      idempotencyKey: 'run-request-1',
      content: '请检查最新资料',
      knowledgeEnabled: true,
      webSearchEnabled: true,
    });
  });

  it('rejects a run without an idempotency key or user content', () => {
    const provider = createPaiChatProvider('conversation-1');

    expect(() =>
      provider.transformParams(
        { messages: [{ role: 'user', content: '问题' }] },
        provider.request.options,
      ),
    ).toThrow('pAI Run 缺少幂等键或用户消息');
  });

  it('keeps reasoning content separate from the final answer', () => {
    const provider = createPaiChatProvider('conversation-1');
    const reasoningMessage = provider.transformMessage({
      chunk: createChunk('reasoning-delta', '先分析条件'),
      chunks: [],
      status: 'updating',
      responseHeaders,
    });
    const completedMessage = provider.transformMessage({
      originMessage: reasoningMessage,
      chunk: createChunk('text-delta', '最终结论'),
      chunks: [],
      status: 'updating',
      responseHeaders,
    });

    expect(reasoningMessage.content).toContain('<think>');
    expect(completedMessage.content).toContain('</think>');
    expect(completedMessage.content).toContain('最终结论');
  });

  it('keeps structured sources across later text chunks', () => {
    const provider = createPaiChatProvider('conversation-1');
    const sourcesMessage = provider.transformMessage({
      chunk: {
        event: 'sources',
        data: JSON.stringify({
          sources: [
            {
              sourceId: 'article-001',
              title: '第一篇资料',
              sourceUrl: 'https://example.com/article-001',
            },
            {
              sourceId: 'web-001',
              sourceType: 'web',
              title: '公开网页',
              sourceUrl: 'https://example.com/web-001',
              snippet: '网页搜索摘要',
            },
          ],
        }),
      },
      chunks: [],
      status: 'updating',
      responseHeaders,
    });
    const completedMessage = provider.transformMessage({
      originMessage: sourcesMessage,
      chunk: createChunk('text-delta', '资料结论'),
      chunks: [],
      status: 'updating',
      responseHeaders,
    });

    expect(completedMessage.sources).toEqual([
      {
        sourceId: 'article-001',
        sourceType: 'knowledge',
        title: '第一篇资料',
        sourceUrl: 'https://example.com/article-001',
      },
      {
        sourceId: 'web-001',
        sourceType: 'web',
        title: '公开网页',
        sourceUrl: 'https://example.com/web-001',
        snippet: '网页搜索摘要',
      },
    ]);
    expect(completedMessage.content).toBe('资料结论');
  });

  it('records business terminal states carried by an HTTP 200 SSE stream', () => {
    const provider = createPaiChatProvider('conversation-1');
    const failedMessage = provider.transformMessage({
      originMessage: { role: 'assistant', content: '部分回答' },
      chunk: {
        event: 'error',
        data: JSON.stringify({ errorMessage: '模型服务暂时不可用' }),
      },
      chunks: [],
      status: 'updating',
      responseHeaders,
    });
    const abortedMessage = provider.transformMessage({
      originMessage: { role: 'assistant', content: '部分回答' },
      chunk: {
        event: 'done',
        data: JSON.stringify({ status: 'aborted' }),
      },
      chunks: [],
      status: 'updating',
      responseHeaders,
    });

    expect(failedMessage).toMatchObject({
      terminalStatus: 'failed',
      errorMessage: '模型服务暂时不可用',
    });
    expect(abortedMessage.terminalStatus).toBe('aborted');
  });
});
