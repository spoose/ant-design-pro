import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Mastra 教程股票接口的响应结构。
 *
 * 在工具边界校验第三方数据，避免接口结构变化后把 undefined 继续交给模型。
 */
const stockPriceResponseSchema = z.object({
  prices: z.object({
    '4. close': z.string(),
  }),
});

/**
 * 查询指定股票最近一个交易日的收盘价。
 *
 * 核心链路：
 * Agent 生成工具参数 → inputSchema 校验 → execute 查询外部接口
 * → outputSchema 校验结果 → 工具结果返回 Agent 生成最终回答。
 */
export const stockPriceTool = createTool({
  id: 'get-stock-price',
  description: '获取指定股票代码最近一个交易日的收盘价',
  inputSchema: z.object({
    symbol: z.string().trim().min(1).max(10),
  }),
  outputSchema: z.object({
    symbol: z.string(),
    closingPrice: z.string(),
  }),
  execute: async ({ symbol }) => {
    // 统一股票代码格式，并在拼接 URL 前编码用户输入。
    const normalizedSymbol = symbol.trim().toUpperCase();
    const response = await fetch(
      `https://mastra-stock-data.vercel.app/api/stock-data?symbol=${encodeURIComponent(normalizedSymbol)}`,
    );

    if (!response.ok) {
      throw new Error(`股票数据服务返回 ${response.status}`);
    }

    const data = stockPriceResponseSchema.parse(await response.json());
    return {
      symbol: normalizedSymbol,
      closingPrice: data.prices['4. close'],
    };
  },
});
