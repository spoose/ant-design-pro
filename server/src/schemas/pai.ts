import { z } from 'zod';

export const paiChatRequestSchema = z
  .object({
    /**
     * 本次请求是否由后端注入本地知识库上下文。
     * 省略时保持普通聊天链路，避免把 UI 编排状态混入 messages。
     */
    knowledgeEnabled: z.boolean().optional().default(false),
    /**
     * 本次请求是否启用联网检索。
     * 开启时由后端使用最后一条用户消息查询公开网页。
     */
    webSearchEnabled: z.boolean().optional().default(false),
    messages: z
      .array(
        z
          .object({
            role: z.enum(['system', 'user', 'assistant']),
            content: z.string().min(1).max(100_000),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();

export type PaiChatRequest = z.infer<typeof paiChatRequestSchema>;
