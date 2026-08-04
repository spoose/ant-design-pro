import { z } from 'zod';
import {
  articleSourceIdSchema,
  loadLocalKnowledgeMaterials,
} from '../knowledge/loadLocalKnowledgeMaterials.js';
import type {
  createResearchIntroductionWorkflow,
  ResearchIntroductionOutput,
} from '../workflows/researchIntroductionWorkflow.js';

const researchIntroductionServiceInputSchema = z
  .object({
    researchPurpose: z.string().trim().min(1).max(2_000),
    interestDirections: z
      .array(z.string().trim().min(1).max(300))
      .min(1)
      .max(10),
    sourceIds: z.array(articleSourceIdSchema).min(1).max(20),
  })
  .strict()
  .superRefine(({ sourceIds }, context) => {
    const seen = new Set<string>();
    sourceIds.forEach((sourceId, index) => {
      if (seen.has(sourceId)) {
        context.addIssue({
          code: 'custom',
          path: ['sourceIds', index],
          message: `sourceId 重复: ${sourceId}`,
        });
      }
      seen.add(sourceId);
    });
  });

type ResearchIntroductionServiceInput = z.infer<
  typeof researchIntroductionServiceInputSchema
>;

type ResearchIntroductionWorkflow = ReturnType<
  typeof createResearchIntroductionWorkflow
>;

/**
 * 将外部可提交的 sourceIds 转换为 Workflow 所需的已解析资料。
 *
 * HTTP 鉴权和 Organization Scope 将来应在调用本 Service 前完成；
 * 本 Service 当前只负责输入校验、资料读取和 Workflow 执行。
 */
export class ResearchIntroductionService {
  constructor(
    private readonly articlesDirectory: string,
    private readonly workflow: ResearchIntroductionWorkflow,
  ) {}

  async generate(
    input: ResearchIntroductionServiceInput,
  ): Promise<ResearchIntroductionOutput> {
    const parsedInput = researchIntroductionServiceInputSchema.parse(input);
    const materials = await loadLocalKnowledgeMaterials(
      this.articlesDirectory,
      parsedInput.sourceIds,
    );

    const run = await this.workflow.createRun();
    const result = await run.start({
      inputData: {
        researchPurpose: parsedInput.researchPurpose,
        interestDirections: parsedInput.interestDirections,
        materials,
      },
    });

    if (result.status === 'success') {
      return result.result;
    }
    if (result.status === 'failed') {
      throw result.error;
    }
    throw new Error(`研究介绍 Workflow 未完成，当前状态: ${result.status}`);
  }
}
