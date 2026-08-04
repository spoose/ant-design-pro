import { createDeepSeek } from '@ai-sdk/deepseek';
import type { DeepSeekEnv } from '../../config/env.js';

export type ConfiguredDeepSeekEnv = DeepSeekEnv & { apiKey: string };

/**
 * 统一创建 DeepSeek 模型，避免 Agent 各自读取 process.env 或重复配置 Provider。
 */
export function createDeepSeekChatModel(config: ConfiguredDeepSeekEnv) {
  const provider = createDeepSeek({ apiKey: config.apiKey });
  return provider(config.model);
}
