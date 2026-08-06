import { describe, expect, it } from 'vitest';
import { createPaiAgent } from '../src/ai/agents/paiAgent.js';
import { toMastraDeepSeekModelId } from '../src/ai/models/deepSeek.js';

describe('pAI Agent', () => {
  it('uses the Mastra DeepSeek model id and a narrow search loop', async () => {
    const agent = createPaiAgent('deepseek-v4-flash', {
      apiKey: 'firecrawl-test-key',
    });

    expect(toMastraDeepSeekModelId('deepseek-v4-flash')).toBe(
      'deepseek/deepseek-v4-flash',
    );
    expect(toMastraDeepSeekModelId('deepseek/deepseek-chat')).toBe(
      'deepseek/deepseek-chat',
    );
    expect(agent.maxRetries).toBe(2);
    expect(await agent.getDefaultOptions()).toMatchObject({
      maxSteps: 3,
      providerOptions: {
        deepseek: {
          thinking: { type: 'enabled' },
        },
      },
    });
    const instructions = await agent.getInstructions();
    expect(instructions).toEqual(
      expect.stringContaining('每个问题最多搜索两次'),
    );
    expect(instructions).toEqual(
      expect.stringContaining('第二次结果仍不足时立即停止搜索'),
    );
    expect(instructions).not.toContain('最多搜索三次');
    expect(instructions).toEqual(
      expect.stringContaining('不得自行猜测当前日期'),
    );
    expect(instructions).toEqual(
      expect.stringContaining('知识和信息可能不是最新'),
    );
  });
});
