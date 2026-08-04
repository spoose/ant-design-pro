import { describe, expect, it, vi } from 'vitest';
import {
  createResearchIntroductionWorkflow,
  researchIntroductionInputSchema,
} from '../src/ai/workflows/researchIntroductionWorkflow.js';

const input = {
  researchPurpose: '了解生成式 AI 对企业知识管理的影响',
  interestDirections: ['知识检索质量', '组织权限边界'],
  materials: [
    {
      sourceId: 'article-001',
      title: '企业知识库实践',
      content: '企业知识库需要同时关注检索效果和访问权限。',
      sourceUrl: 'https://example.com/articles/001',
      updatedAt: '2026-07-29T00:00:00+00:00',
    },
    {
      sourceId: 'article-002',
      title: '生成式 AI 调研',
      content: '生成式 AI 可以辅助归纳资料，但输出仍需要来源核验。',
    },
  ],
};

describe('research introduction workflow', () => {
  it('prepares cited materials and returns the agent introduction', async () => {
    const generate = vi.fn().mockResolvedValue({
      text: '生成式 AI 可以辅助企业知识归纳。[资料:article-002]',
    });
    const workflow = createResearchIntroductionWorkflow({ generate });
    const run = await workflow.createRun();
    const result = await run.start({ inputData: input });

    expect(result.status).toBe('success');
    if (result.status !== 'success') {
      throw new Error(`workflow failed: ${result.status}`);
    }

    expect(result.result).toEqual({
      introduction: '生成式 AI 可以辅助企业知识归纳。[资料:article-002]',
      sources: [
        {
          sourceId: 'article-001',
          title: '企业知识库实践',
          sourceUrl: 'https://example.com/articles/001',
          updatedAt: '2026-07-29T00:00:00+00:00',
        },
        {
          sourceId: 'article-002',
          title: '生成式 AI 调研',
        },
      ],
    });
    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0]?.[0]).toContain(
      '调研目的：\n了解生成式 AI 对企业知识管理的影响',
    );
    expect(generate.mock.calls[0]?.[0]).toContain(
      '<material index="1" sourceId="article-001">',
    );
    expect(generate.mock.calls[0]?.[0]).toContain(
      '企业知识库需要同时关注检索效果和访问权限。',
    );
  });

  it('rejects missing interests or materials at the internal boundary', () => {
    expect(
      researchIntroductionInputSchema.safeParse({
        researchPurpose: '测试',
        interestDirections: [],
        materials: [],
      }).success,
    ).toBe(false);
  });

  it('fails instead of returning an empty model response', async () => {
    const workflow = createResearchIntroductionWorkflow({
      generate: vi.fn().mockResolvedValue({ text: '   ' }),
    });
    const run = await workflow.createRun();
    const result = await run.start({ inputData: input });

    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error.message).toBe('研究介绍 Agent 返回了空内容');
    }
  });
});
