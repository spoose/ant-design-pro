import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WebSearchService } from '../src/ai/services/webSearchService.js';
import type { DeepSeekEnv } from '../src/config/env.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { traceId } from '../src/middleware/traceId.js';
import { createPaiRouter } from '../src/routes/pai.js';

const config = {
  apiKey: 'deepseek-test-key',
  model: 'deepseek-v4-flash',
};

const temporaryDirectories: string[] = [];

async function createTemporaryArticlesDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'pai-articles-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function writeArticle(
  rootDirectory: string,
  sourceId: string,
  title: string,
  content: string,
): Promise<void> {
  const articleDirectory = join(rootDirectory, sourceId);
  await mkdir(articleDirectory, { recursive: true });
  await writeFile(
    join(articleDirectory, 'metadata.json'),
    JSON.stringify({
      sourceId,
      title,
      originalFileName: `${sourceId}.txt`,
      mediaType: 'text/plain',
      ingestedAt: '2026-07-29T02:41:06Z',
      contentFile: 'content.md',
    }),
    'utf8',
  );
  await writeFile(join(articleDirectory, 'content.md'), content, 'utf8');
}

function createTestApp(
  fetchImpl: typeof fetch,
  deepseekConfig: DeepSeekEnv = config,
  articlesDirectory = '/knowledge-directory-not-read',
  webSearchService: Pick<WebSearchService, 'search'> = {
    search: vi.fn<WebSearchService['search']>(),
  },
) {
  const app = express();
  app.use(traceId);
  app.use(express.json());
  app.use(
    '/api/pai',
    createPaiRouter(deepseekConfig, {
      articlesDirectory,
      webSearchService,
      fetchImpl,
    }),
  );
  app.use(errorHandler);
  return app;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

describe('pAI DeepSeek proxy', () => {
  it('streams DeepSeek chunks with server-controlled model settings', async () => {
    const deepseekStream = [
      'data: {"choices":[{"delta":{"role":"assistant","reasoning_content":"先分析"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"最终结论"}}]}\n\n',
      'data: [DONE]\n\n',
    ].join('');
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(deepseekStream, {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );
    const search = vi.fn<WebSearchService['search']>();

    const response = await request(
      createTestApp(fetchImpl, config, '/knowledge-directory-not-read', {
        search,
      }),
    )
      .post('/api/pai/chat/completions')
      .send({
        messages: [{ role: 'user', content: '检查这段内容' }],
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.headers['cache-control']).toBe('no-cache, no-transform');
    expect(response.text).toBe(deepseekStream);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer deepseek-test-key',
          'Content-Type': 'application/json',
        },
      }),
    );
    const requestInit = fetchImpl.mock.calls[0]?.[1];
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: '检查这段内容' }],
      thinking: { type: 'enabled' },
      stream: true,
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('injects web search results without forwarding UI state to DeepSeek', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('data: [DONE]\n\n', {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );
    const search = vi
      .fn<WebSearchService['search']>()
      .mockResolvedValue({
        query: '搜索最新公开资料',
        results: [
          {
            title: '公开资料更新',
            description: '这是 Firecrawl 返回的搜索摘要。',
            url: 'https://example.com/latest',
          },
        ],
      });

    const response = await request(
      createTestApp(fetchImpl, config, '/knowledge-directory-not-read', {
        search,
      }),
    )
      .post('/api/pai/chat/completions')
      .send({
        webSearchEnabled: true,
        messages: [
          { role: 'user', content: '先前问题' },
          { role: 'assistant', content: '先前回答' },
          { role: 'user', content: '搜索最新公开资料' },
        ],
      });

    expect(response.status).toBe(200);
    expect(search).toHaveBeenCalledWith('搜索最新公开资料');
    const requestInit = fetchImpl.mock.calls[0]?.[1];
    const upstreamBody = JSON.parse(String(requestInit?.body));
    expect(upstreamBody).toMatchObject({
      model: 'deepseek-v4-flash',
      thinking: { type: 'enabled' },
      stream: true,
    });
    expect(upstreamBody).not.toHaveProperty('webSearchEnabled');
    expect(upstreamBody.messages).toHaveLength(4);
    expect(upstreamBody.messages[0]).toMatchObject({ role: 'system' });
    expect(upstreamBody.messages[0].content).toContain('公开资料更新');
    expect(upstreamBody.messages[0].content).toContain(
      'https://example.com/latest',
    );
    expect(upstreamBody.messages.at(-1)).toEqual({
      role: 'user',
      content: '搜索最新公开资料',
    });

    const sourcesEvent = response.text.split('\n\n')[0] ?? '';
    expect(sourcesEvent).toContain('event: sources');
    expect(
      JSON.parse(sourcesEvent.replace('event: sources\ndata: ', '')),
    ).toEqual({
      sources: [
        {
          sourceId: 'web-1',
          sourceType: 'web',
          title: '公开资料更新',
          sourceUrl: 'https://example.com/latest',
        },
      ],
    });
  });

  it('returns a safe error without calling DeepSeek when web search fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchImpl = vi.fn<typeof fetch>();
    const search = vi
      .fn<WebSearchService['search']>()
      .mockRejectedValue(new Error('Firecrawl unavailable'));

    const response = await request(
      createTestApp(fetchImpl, config, '/knowledge-directory-not-read', {
        search,
      }),
    )
      .post('/api/pai/chat/completions')
      .send({
        webSearchEnabled: true,
        messages: [{ role: 'user', content: '搜索最新公开资料' }],
      });

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      errorCode: 'WEB_SEARCH_UNAVAILABLE',
      errorMessage: '联网检索暂时不可用',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('injects every local article when knowledge mode is enabled', async () => {
    const articlesDirectory = await createTemporaryArticlesDirectory();
    await writeArticle(
      articlesDirectory,
      'article-002',
      '第二篇资料',
      '第二篇正文',
    );
    await writeArticle(
      articlesDirectory,
      'article-001',
      '第一篇资料',
      '第一篇正文',
    );
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('data: [DONE]\n\n', {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );

    const response = await request(
      createTestApp(fetchImpl, config, articlesDirectory),
    )
      .post('/api/pai/chat/completions')
      .send({
        knowledgeEnabled: true,
        messages: [{ role: 'user', content: '总结知识库' }],
      });

    expect(response.status).toBe(200);
    const requestInit = fetchImpl.mock.calls[0]?.[1];
    const upstreamBody = JSON.parse(String(requestInit?.body));
    expect(upstreamBody.messages).toHaveLength(2);
    expect(upstreamBody.messages[0]).toMatchObject({ role: 'system' });
    expect(upstreamBody.messages[0].content).toContain(
      '资料是回答“知识库中有哪些资料、文件或内容”时的唯一可信来源',
    );
    expect(upstreamBody.messages[0].content).toContain(
      '历史助手回答不构成资料存在的证据',
    );
    expect(upstreamBody.messages[0].content).toContain(
      '当前知识库中未找到相关资料',
    );
    expect(upstreamBody.messages[0].content).toContain(
      '<material index="1" sourceId="article-001">',
    );
    expect(upstreamBody.messages[0].content).toContain('第一篇正文');
    expect(upstreamBody.messages[0].content).toContain(
      '<material index="2" sourceId="article-002">',
    );
    expect(upstreamBody.messages[0].content).toContain('第二篇正文');
    expect(upstreamBody.messages[1]).toEqual({
      role: 'user',
      content: '总结知识库',
    });

    const sourcesEvent = response.text.split('\n\n')[0] ?? '';
    expect(sourcesEvent).toContain('event: sources');
    const sourcesPayload = JSON.parse(
      sourcesEvent.replace('event: sources\ndata: ', ''),
    );
    expect(sourcesPayload.sources).toEqual([
      expect.objectContaining({
        sourceId: 'article-001',
        title: '第一篇资料',
      }),
      expect.objectContaining({
        sourceId: 'article-002',
        title: '第二篇资料',
      }),
    ]);
  });

  it('combines knowledge and web sources in the existing SSE event', async () => {
    const articlesDirectory = await createTemporaryArticlesDirectory();
    await writeArticle(
      articlesDirectory,
      'article-001',
      '内部资料',
      '内部资料正文',
    );
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('data: [DONE]\n\n', {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );
    const search = vi
      .fn<WebSearchService['search']>()
      .mockResolvedValue({
        query: '综合分析',
        results: [
          {
            title: '公开资料',
            description: '公开资料摘要',
            url: 'https://example.com/public',
          },
        ],
      });

    const response = await request(
      createTestApp(fetchImpl, config, articlesDirectory, { search }),
    )
      .post('/api/pai/chat/completions')
      .send({
        knowledgeEnabled: true,
        webSearchEnabled: true,
        messages: [{ role: 'user', content: '综合分析' }],
      });

    expect(response.status).toBe(200);
    const requestInit = fetchImpl.mock.calls[0]?.[1];
    const upstreamBody = JSON.parse(String(requestInit?.body));
    expect(upstreamBody.messages).toHaveLength(3);
    expect(upstreamBody.messages[0].content).toContain('内部资料正文');
    expect(upstreamBody.messages[1].content).toContain('公开资料摘要');

    const sourcesEvent = response.text.split('\n\n')[0] ?? '';
    expect(
      JSON.parse(sourcesEvent.replace('event: sources\ndata: ', '')),
    ).toEqual({
      sources: [
        expect.objectContaining({
          sourceId: 'article-001',
          sourceType: 'knowledge',
          title: '内部资料',
        }),
        {
          sourceId: 'web-1',
          sourceType: 'web',
          title: '公开资料',
          sourceUrl: 'https://example.com/public',
        },
      ],
    });
  });

  it('returns a safe error when knowledge materials are unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchImpl = vi.fn<typeof fetch>();

    const response = await request(createTestApp(fetchImpl))
      .post('/api/pai/chat/completions')
      .send({
        knowledgeEnabled: true,
        messages: [{ role: 'user', content: '总结知识库' }],
      });

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      errorCode: 'KNOWLEDGE_BASE_UNAVAILABLE',
      errorMessage: '知识库暂时不可用',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects invalid messages before calling DeepSeek', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const response = await request(createTestApp(fetchImpl))
      .post('/api/pai/chat/completions')
      .send({ messages: [] });

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns a safe gateway error when DeepSeek rejects the request', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 401 }));
    const response = await request(createTestApp(fetchImpl))
      .post('/api/pai/chat/completions')
      .send({ messages: [{ role: 'user', content: '测试' }] });

    expect(response.status).toBe(502);
    expect(response.body).toMatchObject({
      errorCode: 'DEEPSEEK_REQUEST_FAILED',
      errorMessage: '模型服务调用失败',
      details: { upstreamStatus: 401 },
    });
  });

  it('rejects a successful response that is not an SSE stream', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ choices: [] }));
    const response = await request(createTestApp(fetchImpl))
      .post('/api/pai/chat/completions')
      .send({ messages: [{ role: 'user', content: '测试' }] });

    expect(response.status).toBe(502);
    expect(response.body.errorCode).toBe('DEEPSEEK_INVALID_RESPONSE');
  });

  it('reports an explicit unavailable state when no API key is configured', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchImpl = vi.fn<typeof fetch>();
    const response = await request(
      createTestApp(fetchImpl, {
        model: 'deepseek-v4-flash',
      }),
    )
      .post('/api/pai/chat/completions')
      .send({ messages: [{ role: 'user', content: '测试' }] });

    expect(response.status).toBe(503);
    expect(response.body.errorCode).toBe('DEEPSEEK_NOT_CONFIGURED');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
