/**
 * Mastra Model Router 使用 provider/model 形式，DeepSeek 原生环境
 * 变量仍保留简短模型名，方便运维配置。
 */
export function toMastraDeepSeekModelId(
  model: string,
): `deepseek/${string}` {
  const normalizedModel = model.startsWith('deepseek/')
    ? model.slice('deepseek/'.length)
    : model;
  return `deepseek/${normalizedModel}`;
}
