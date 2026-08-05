import { z } from 'zod';

/**
 * AI 功能共享的知识资料模型。
 *
 * 它只描述已经完成授权与解析的运行时资料，不依赖 Express、Mastra 或模型
 * Provider。当前本地文件加载器和未来 RAG Retriever 都应输出这一结构。
 */
export const knowledgeMaterialSchema = z
  .object({
    sourceId: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(500),
    content: z.string().trim().min(1).max(200_000),
    sourceUrl: z.string().url().optional(),
    publishedAt: z.string().datetime({ offset: true }).optional(),
    updatedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

/**
 * 可以返回给调用方的来源元数据。显式 Pick 可避免未来新增内部字段时意外泄露。
 */
export const knowledgeSourceSchema = knowledgeMaterialSchema.pick({
  sourceId: true,
  title: true,
  sourceUrl: true,
  publishedAt: true,
  updatedAt: true,
});

export type KnowledgeMaterial = z.infer<typeof knowledgeMaterialSchema>;
export type KnowledgeSource = z.infer<typeof knowledgeSourceSchema>;
