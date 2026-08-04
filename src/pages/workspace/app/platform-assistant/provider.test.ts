/**
 * Provider 协议测试：
 * 覆盖登录凭证、DeepSeek 流拼接、sources 事件保留以及出站消息清洗。
 */
import { afterEach, describe, expect, it } from 'vitest';
import { setAccessToken } from '@/utils/authToken';
import { createPaiChatProvider } from './provider';

const responseHeaders = new Headers({
  'content-type': 'text/event-stream',
});

const createChunk = (delta: Record<string, string>) => ({
  data: JSON.stringify({ choices: [{ delta }] }),
});

describe('pAI DeepSeek provider', () => {
  afterEach(() => {
    setAccessToken();
  });

  it('calls the backend proxy with the current login token', () => {
    setAccessToken('access-token');

    const provider = createPaiChatProvider();

    expect(provider.request.baseURL).toBe('/api/pai/chat/completions');
    expect(provider.request.options.headers).toEqual({
      Authorization: 'Bearer access-token',
    });
    expect(provider.request.options.params).toBeUndefined();
  });

  it('keeps reasoning content separate from the final answer', () => {
    const provider = createPaiChatProvider();
    const reasoningMessage = provider.transformMessage({
      chunk: createChunk({
        role: 'assistant',
        reasoning_content: '先分析条件',
      }),
      chunks: [],
      status: 'updating',
      responseHeaders,
    });
    const completedMessage = provider.transformMessage({
      originMessage: reasoningMessage,
      chunk: createChunk({ role: 'assistant', content: '最终结论' }),
      chunks: [],
      status: 'updating',
      responseHeaders,
    });

    expect(reasoningMessage.content).toContain('<think>');
    expect(completedMessage.content).toContain('</think>');
    expect(completedMessage.content).toContain('最终结论');
  });

  it('keeps structured sources across later DeepSeek chunks', () => {
    const provider = createPaiChatProvider();
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
      chunk: createChunk({ role: 'assistant', content: '资料结论' }),
      chunks: [],
      status: 'updating',
      responseHeaders,
    });
    const successMessage = provider.transformMessage({
      originMessage: completedMessage,
      // X SDK 的 onSuccess 会在没有新分块时再次收口消息状态。
      chunk: undefined as never,
      chunks: [],
      status: 'success',
      responseHeaders,
    });

    expect(sourcesMessage.sources).toEqual([
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
    expect(completedMessage.sources).toEqual(sourcesMessage.sources);
    expect(completedMessage.content).toBe('资料结论');
    expect(successMessage.sources).toEqual(sourcesMessage.sources);
    expect(successMessage.content).toBe('资料结论');
  });

  it('excludes an empty failed placeholder from the next request', () => {
    const provider = createPaiChatProvider();
    provider.injectGetMessages(() => [
      { role: 'user', content: '第一次提问' },
      { role: 'assistant', content: '' },
      { role: 'user', content: '失败后再次提问' },
    ]);

    const params = provider.transformParams({}, provider.request.options);

    expect(params.messages).toEqual([
      { role: 'user', content: '第一次提问' },
      { role: 'user', content: '失败后再次提问' },
    ]);
  });

  it('strips UI-only sources from the next model request', () => {
    const provider = createPaiChatProvider();
    provider.injectGetMessages(() => [
      { role: 'user', content: '第一次提问' },
      {
        role: 'assistant',
        content: '带有来源的回答',
        sources: [
          {
            sourceId: 'article-001',
            sourceType: 'knowledge',
            title: '第一篇资料',
          },
        ],
      },
      { role: 'user', content: '继续提问' },
    ]);

    const params = provider.transformParams({}, provider.request.options);

    expect(params.messages).toEqual([
      { role: 'user', content: '第一次提问' },
      { role: 'assistant', content: '带有来源的回答' },
      { role: 'user', content: '继续提问' },
    ]);
  });

  it('keeps the knowledge option while assembling conversation messages', () => {
    const provider = createPaiChatProvider();
    provider.injectGetMessages(() => [
      { role: 'user', content: '请总结已有资料' },
    ]);

    const params = provider.transformParams(
      { knowledgeEnabled: true },
      provider.request.options,
    );

    expect(params.knowledgeEnabled).toBe(true);
    expect(params.messages).toEqual([
      { role: 'user', content: '请总结已有资料' },
    ]);
  });

  it('keeps the web search option outside model messages', () => {
    const provider = createPaiChatProvider();
    provider.injectGetMessages(() => [
      { role: 'user', content: '请搜索最新公开资料' },
    ]);

    const params = provider.transformParams(
      { webSearchEnabled: true },
      provider.request.options,
    );

    expect(params.webSearchEnabled).toBe(true);
    expect(params.messages).toEqual([
      { role: 'user', content: '请搜索最新公开资料' },
    ]);
  });
});
