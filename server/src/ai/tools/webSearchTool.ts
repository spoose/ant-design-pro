import { createTool } from '@mastra/core/tools';
import type { FirecrawlEnv } from '../../config/env.js';
import {
  WebSearchService,
  webSearchInputSchema,
  webSearchResponseSchema,
} from '../services/webSearchService.js';

/**
 * Mastra Web Search Tool 适配层。
 * Tool 只声明模型可见的能力契约，实际 Firecrawl 调用与结果清洗由
 * WebSearchService 负责，pAI Agent 只控制何时调用与调用次数。
 */
export function createWebSearchTool(config: FirecrawlEnv) {
  const webSearchService = new WebSearchService(config);

  return createTool({
    id: 'web-search',
    description:
      '搜索公开互联网，返回网页标题、搜索摘要和 URL；适用于需要最新公开信息的问题',
    inputSchema: webSearchInputSchema,
    outputSchema: webSearchResponseSchema,
    execute: ({ query }) => webSearchService.search(query),
  });
}
