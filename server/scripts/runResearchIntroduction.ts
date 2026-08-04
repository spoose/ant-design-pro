import 'dotenv/config';
import { resolve } from 'node:path';
import { createLocalResearchIntroductionService } from '../src/ai/index.js';
import { loadDeepSeekEnv } from '../src/config/env.js';

/**
 * 当前本地验证样例。
 *
 * 这里只修改调研输入和明确选择的 sourceIds；文章正文仍由后端从
 * .data/ai/articles 读取，不把任意文件路径交给模型。
 */
const verificationInput = {
  researchPurpose: '向前来调研的客户，介绍公司的业务',
  interestDirections: [
    '客户是政府部门',
    // '极端天气与大型活动中的跨部门协作',
    // '现有资料的能力边界和后续调研问题',
  ],
  sourceIds: ['wechat_2027430', 'wechat_2027713', 'wechat_2027720'],
};

async function runResearchIntroduction(): Promise<void> {
  const deepseek = loadDeepSeekEnv();
  if (!deepseek.apiKey) {
    throw new Error(
      '缺少 DEEPSEEK_API_KEY；请在后端 .env 中配置后再运行本地调研验证',
    );
  }

  // npm script 从 server 包根目录运行；真实文章目录被 .gitignore 排除。
  const articlesDirectory = resolve('.data/ai/articles');
  const service = createLocalResearchIntroductionService(
    {
      apiKey: deepseek.apiKey,
      model: deepseek.model,
    },
    articlesDirectory,
  );

  console.info(`正在使用 ${deepseek.model} 生成本地调研介绍...`);
  const result = await service.generate(verificationInput);

  console.info('\n=== 调研介绍 ===\n');
  console.info(result.introduction);
  console.info('\n=== 使用资料 ===\n');
  for (const source of result.sources) {
    console.info(`- [${source.sourceId}] ${source.title}`);
  }
}

runResearchIntroduction().catch((error: unknown) => {
  console.error(
    '本地调研验证失败：',
    error instanceof Error ? error.message : '未知错误',
  );
  process.exitCode = 1;
});
