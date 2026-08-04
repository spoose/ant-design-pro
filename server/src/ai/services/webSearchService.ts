import { Firecrawl } from 'firecrawl';
import { z } from 'zod';
import type { FirecrawlEnv } from '../../config/env.js';

export const webSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(500),
});

const webSearchResultSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string().url(),
});

export const webSearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(webSearchResultSchema),
});

export type WebSearchResponse = z.infer<typeof webSearchResponseSchema>;

/**
 * Firecrawl 搜索核心。
 *
 * pAI HTTP 编排与 Mastra Tool 共用这一边界，避免重复维护查询清洗、
 * Firecrawl 参数和结果投影；模型提示词与 Tool 元数据不属于本层职责。
 */
export class WebSearchService {
  private readonly firecrawl: Pick<Firecrawl, 'search'>;

  constructor(
    config: FirecrawlEnv,
    firecrawl?: Pick<Firecrawl, 'search'>,
  ) {
    // SDK 实例随 Service 复用，避免每次查询都重复初始化客户端。
    this.firecrawl =
      firecrawl ??
      new Firecrawl(config.apiKey ? { apiKey: config.apiKey } : {});
  }

  async search(query: string): Promise<WebSearchResponse> {
    const { query: normalizedQuery } = webSearchInputSchema.parse({ query });
    const response = await this.firecrawl.search(normalizedQuery, {
      // Firecrawl 默认搜索 web；这里只覆盖默认 10 条为 5 条以控制延迟和 credits。
      limit: 5,
    });

    // 未启用 scrapeOptions，因此只投影普通 web 结果需要的最小字段。
    const results = (response.web ?? []).flatMap((item) => {
      // SDK 的联合类型还包含启用 scrapeOptions 时返回的 Document。
      if (!('url' in item)) {
        return [];
      }

      return [
        {
          title: item.title?.trim() || item.url,
          description: item.description?.trim() || '',
          url: item.url,
        },
      ];
    });

    return {
      query: normalizedQuery,
      results,
    };
  }
}
