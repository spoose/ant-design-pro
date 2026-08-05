import type { Firecrawl } from 'firecrawl';
import { describe, expect, it, vi } from 'vitest';
import { WebSearchService } from '../src/ai/services/webSearchService.js';

describe('WebSearchService', () => {
  it('normalizes the query and returns only valid minimal web results', async () => {
    const search = vi.fn<Firecrawl['search']>().mockResolvedValue({
      web: [
        {
          url: 'https://example.com/first',
          title: '  第一条结果  ',
          description: '  第一条摘要  ',
          category: 'news',
        },
        {
          url: 'https://example.com/without-title',
          title: '   ',
          description: '   ',
        },
      ],
    });
    const service = new WebSearchService({}, { search });

    const result = await service.search('  最新公开资料  ');

    expect(search).toHaveBeenCalledWith('最新公开资料', { limit: 5 });
    expect(result).toEqual({
      query: '最新公开资料',
      results: [
        {
          title: '第一条结果',
          description: '第一条摘要',
          url: 'https://example.com/first',
        },
        {
          title: 'https://example.com/without-title',
          description: '',
          url: 'https://example.com/without-title',
        },
      ],
    });
  });

  it('rejects an empty query before calling Firecrawl', async () => {
    const search = vi.fn<Firecrawl['search']>();
    const service = new WebSearchService({}, { search });

    await expect(service.search('   ')).rejects.toThrow();
    expect(search).not.toHaveBeenCalled();
  });
});
