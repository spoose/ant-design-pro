import { Agent } from '@mastra/core/agent';
import { toMastraDeepSeekModelId } from '../models/deepSeek.js';
import { stockPriceTool } from '../tools/stockPriceTool.js';

/**
 * 创建用于验证 Mastra Tool Calling 的最小股票 Agent。
 *
 * Agent 只负责判断何时调用工具和组织答案；股票数据获取由 Tool 负责，
 * 模型 ID 使用 Mastra Model Router 的统一格式。
 */
export function createStockAgent(model: string) {
  return new Agent({
    id: 'stock-agent',
    name: 'Stock Agent',
    instructions: `
你是股票价格查询助手。

规则：
1. 用户询问股票价格时，必须调用 stockPriceTool 获取数据，不得凭模型知识猜测价格。
2. 明确说明工具返回的是最近一个交易日的收盘价，不是实时价格。
3. 如果用户没有提供股票代码，应先请用户补充，不得自行假定。
    `.trim(),
    model: toMastraDeepSeekModelId(model),
    tools: {
      stockPriceTool,
    },
  });
}
