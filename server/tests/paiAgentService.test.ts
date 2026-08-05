import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type PaiAgentRunner,
  PaiAgentService,
} from '../src/ai/services/paiAgentService.js';

const createStream = (chunks: unknown[]) =>
  new ReadableStream<unknown>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-04T03:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PaiAgentService', () => {
  it('passes complete history and exposes cumulative sources from retries', async () => {
    const stream = vi.fn<PaiAgentRunner['stream']>().mockResolvedValue({
      fullStream: createStream([
        {
          type: 'reasoning-delta',
          payload: { text: '先理解上下文' },
        },
        {
          type: 'tool-result',
          payload: {
            toolName: 'webSearchTool',
            result: {
              query: '台风白海豚最新情况',
              results: [
                {
                  title: '第一条',
                  description: '第一条摘要',
                  url: 'https://example.com/first',
                },
              ],
            },
          },
        },
        {
          type: 'tool-result',
          payload: {
            toolName: 'webSearchTool',
            result: {
              query: '台风白海豚气象台更新',
              results: [
                {
                  title: '第一条更新',
                  description: '更新摘要',
                  url: 'https://example.com/first',
                },
                {
                  title: '第二条',
                  description: '',
                  url: 'https://example.com/second',
                },
              ],
            },
          },
        },
        { type: 'text-delta', payload: { text: '最终结论' } },
      ]),
    });
    const service = new PaiAgentService({ stream });
    const messages = [
      { role: 'user' as const, content: '搜索台风海豚' },
      { role: 'assistant' as const, content: '上一轮结果' },
      { role: 'user' as const, content: '再次搜索' },
    ];

    const events = [];
    for await (const event of await service.stream(messages, {
      webSearchEnabled: true,
    })) {
      events.push(event);
    }

    expect(stream).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('当前日期：2026-08-04'),
        }),
        ...messages,
      ],
      { activeTools: ['webSearchTool'] },
    );
    expect(events).toEqual([
      { type: 'reasoning-delta', text: '先理解上下文' },
      {
        type: 'sources',
        sources: [
          {
            sourceId: 'web-1',
            sourceType: 'web',
            title: '第一条',
            sourceUrl: 'https://example.com/first',
            snippet: '第一条摘要',
          },
        ],
      },
      {
        type: 'sources',
        sources: [
          {
            sourceId: 'web-1',
            sourceType: 'web',
            title: '第一条更新',
            sourceUrl: 'https://example.com/first',
            snippet: '更新摘要',
          },
          {
            sourceId: 'web-2',
            sourceType: 'web',
            title: '第二条',
            sourceUrl: 'https://example.com/second',
          },
        ],
      },
      { type: 'text-delta', text: '最终结论' },
    ]);
  });

  it('disables the search tool for ordinary chat', async () => {
    const stream = vi.fn<PaiAgentRunner['stream']>().mockResolvedValue({
      fullStream: createStream([]),
    });
    const service = new PaiAgentService({ stream });

    for await (const _event of await service.stream(
      [{ role: 'user', content: '你好' }],
      { webSearchEnabled: false },
    )) {
      // Empty model stream for this boundary test.
    }

    expect(stream).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          role: 'system',
          content: expect.stringMatching(
            /当前日期：2026-08-04[\s\S]*知识和信息可能不是最新/,
          ),
        }),
        { role: 'user', content: '你好' },
      ],
      { activeTools: [] },
    );
  });
});
