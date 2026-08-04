import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import {
  formatKnowledgeMaterialsForPrompt,
  toKnowledgeSources,
} from '../knowledge/formatKnowledgeMaterials.js';
import {
  knowledgeMaterialSchema,
  knowledgeSourceSchema,
} from '../knowledge/knowledgeMaterial.js';

export const researchIntroductionInputSchema = z
  .object({
    researchPurpose: z.string().trim().min(1).max(2_000),
    interestDirections: z
      .array(z.string().trim().min(1).max(300))
      .min(1)
      .max(10),
    // Workflow 只消费知识模块已经授权并解析的资料，不负责读取文件或检索。
    materials: z.array(knowledgeMaterialSchema).min(1).max(20),
  })
  .strict();

const preparedResearchSchema = z.object({
  prompt: z.string().min(1),
  sources: z.array(knowledgeSourceSchema).min(1),
});

const researchIntroductionOutputSchema = z.object({
  introduction: z.string().min(1),
  sources: z.array(knowledgeSourceSchema).min(1),
});

type ResearchIntroductionInput = z.infer<
  typeof researchIntroductionInputSchema
>;
export type ResearchIntroductionOutput = z.infer<
  typeof researchIntroductionOutputSchema
>;
interface ResearchIntroductionAgentPort {
  generate(prompt: string): Promise<{ text: string }>;
}

function buildResearchPrompt(input: ResearchIntroductionInput): string {
  return `
请根据以下研究目标和资料生成介绍。

调研目的：
${input.researchPurpose}

兴趣方向：
${input.interestDirections.map((direction) => `- ${direction}`).join('\n')}

资料：
${formatKnowledgeMaterialsForPrompt(input.materials)}
  `.trim();
}

/**
 * 核心研究介绍 Workflow：
 * 1. 将已解析资料整理成受约束 Prompt。
 * 2. 调用研究介绍 Agent。
 *
 * 资料读取、权限校验、在线更新和 PPT 生成故意留在 Workflow 之外。
 */
export function createResearchIntroductionWorkflow(
  agent: ResearchIntroductionAgentPort,
) {
  const prepareResearchContext = createStep({
    id: 'prepare-research-context',
    inputSchema: researchIntroductionInputSchema,
    outputSchema: preparedResearchSchema,
    execute: async ({ inputData }) => ({
      prompt: buildResearchPrompt(inputData),
      sources: toKnowledgeSources(inputData.materials),
    }),
  });

  const generateIntroduction = createStep({
    id: 'generate-research-introduction',
    inputSchema: preparedResearchSchema,
    outputSchema: researchIntroductionOutputSchema,
    execute: async ({ inputData }) => {
      const result = await agent.generate(inputData.prompt);
      const introduction = result.text.trim();
      if (!introduction) {
        throw new Error('研究介绍 Agent 返回了空内容');
      }
      return {
        introduction,
        sources: inputData.sources,
      };
    },
  });

  return createWorkflow({
    id: 'research-introduction-workflow',
    inputSchema: researchIntroductionInputSchema,
    outputSchema: researchIntroductionOutputSchema,
  })
    .then(prepareResearchContext)
    .then(generateIntroduction)
    .commit();
}
