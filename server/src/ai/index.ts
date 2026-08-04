import { createResearchIntroductionAgent } from './agents/researchIntroductionAgent.js';
import type { ConfiguredDeepSeekEnv } from './providers/deepSeek.js';
import { ResearchIntroductionService } from './services/researchIntroductionService.js';
import { createResearchIntroductionWorkflow } from './workflows/researchIntroductionWorkflow.js';

/**
 * 创建尚未注册到 HTTP 路由的核心研究 Workflow。
 * 调用方必须显式提供已配置的 DeepSeek 环境，模块导入本身不会发起模型请求。
 */
function createCoreResearchIntroductionWorkflow(config: ConfiguredDeepSeekEnv) {
  const agent = createResearchIntroductionAgent(config);
  return createResearchIntroductionWorkflow(agent);
}

/**
 * 创建本地开发阶段的完整调研服务，但不会注册 HTTP 路由或立即调用模型。
 */
export function createLocalResearchIntroductionService(
  config: ConfiguredDeepSeekEnv,
  articlesDirectory: string,
) {
  const workflow = createCoreResearchIntroductionWorkflow(config);
  return new ResearchIntroductionService(articlesDirectory, workflow);
}
