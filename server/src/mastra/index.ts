import { Mastra } from '@mastra/core';
import { createStockAgent } from '../ai/agents/stockAgent.js';
import { createWebSearchAgent } from '../ai/agents/webSearchAgent.js';
import { loadDeepSeekEnv, loadFirecrawlEnv } from '../config/env.js';

const deepseek = loadDeepSeekEnv();
if (!deepseek.apiKey) {
  throw new Error(
    '缺少 DEEPSEEK_API_KEY；启动 Mastra Studio 前请先配置后端环境变量',
  );
}

const modelConfig = {
  apiKey: deepseek.apiKey,
  model: deepseek.model,
};

/**
 * Mastra 的根注册表。
 *
 * mastra dev 从这个入口发现 Agent，并据此生成 Studio 调试界面和 HTTP API。
 * 每个注册键同时是开发服务器 Agent 路由中的名称。
 */
const stockAgent = createStockAgent(modelConfig);
const webSearchAgent = createWebSearchAgent(
  modelConfig,
  loadFirecrawlEnv(),
);

export const mastra = new Mastra({
  agents: {
    stockAgent,
    webSearchAgent,
  },
  // 与现有 Express 的 PORT=3000 隔离，保持 Mastra Studio 默认开发端口。
  server: {
    port: 4111,
  },
});
