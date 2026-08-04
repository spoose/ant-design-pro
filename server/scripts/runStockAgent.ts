import 'dotenv/config';
import { createStockAgent } from '../src/ai/agents/stockAgent.js';
import { loadDeepSeekEnv } from '../src/config/env.js';

/**
 * 第一阶段本地验证入口。
 *
 * 该脚本直接调用 Agent，不启动 Express，也不读取数据库、JWT 或端口配置。
 * 验证成功即说明 DeepSeek → Agent → Tool → 股票接口 → 最终回答链路已跑通。
 */
async function runStockAgent(): Promise<void> {
  const deepseek = loadDeepSeekEnv();
  if (!deepseek.apiKey) {
    throw new Error(
      '缺少 DEEPSEEK_API_KEY；请在后端 .env 中配置后再运行股票 Agent 验证',
    );
  }

  const agent = createStockAgent({
    apiKey: deepseek.apiKey,
    model: deepseek.model,
  });

  console.info(`正在使用 ${deepseek.model} 查询 AAPL 收盘价...`);
  const result = await agent.generate(
    '苹果公司 AAPL 最近一个交易日的收盘价是多少？',
  );

  // 第一阶段必须确认模型确实执行过 Tool，不能仅凭最终文本判断成功。
  if (result.toolResults.length === 0) {
    throw new Error('模型没有调用股票查询工具，本次验证不能视为跑通');
  }

  console.info('\n=== Tool 执行结果 ===\n');
  for (const toolResult of result.toolResults) {
    console.info(
      `- ${toolResult.payload.toolName}: ${JSON.stringify(toolResult.payload.result)}`,
    );
  }

  console.info('\n=== Stock Agent 回答 ===\n');
  console.info(result.text);
}

runStockAgent().catch((error: unknown) => {
  console.error(
    'Stock Agent 本地验证失败：',
    error instanceof Error ? error.message : '未知错误',
  );
  process.exitCode = 1;
});
