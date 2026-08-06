import { z } from 'zod';

const conversationTitle = z
  .string({ error: '会话标题必须是字符串' })
  .trim()
  .min(1, '会话标题不能为空')
  .max(120, '会话标题不能超过 120 个字符');

export const createPaiConversationSchema = z.discriminatedUnion('scopeType', [
  z
    .object({
      scopeType: z.literal('platform'),
      title: conversationTitle,
    })
    .strict(),
  z
    .object({
      scopeType: z.literal('organization'),
      organizationId: z.uuid('organizationId 必须是有效 UUID'),
      title: conversationTitle,
    })
    .strict(),
]);

export const listPaiConversationsQuerySchema = z.discriminatedUnion(
  'scopeType',
  [
    z
      .object({
        scopeType: z.literal('platform'),
        limit: z.coerce.number().int().min(1).max(100).default(30),
      })
      .strict(),
    z
      .object({
        scopeType: z.literal('organization'),
        organizationId: z.uuid('organizationId 必须是有效 UUID'),
        limit: z.coerce.number().int().min(1).max(100).default(30),
      })
      .strict(),
  ],
);

export const paiConversationParamsSchema = z
  .object({
    conversationId: z.uuid('conversationId 必须是有效 UUID'),
  })
  .strict();

export const updatePaiConversationSchema = z
  .object({
    title: conversationTitle,
  })
  .strict();

export const startPaiRunSchema = z
  .object({
    idempotencyKey: z.uuid('idempotencyKey 必须是有效 UUID'),
    content: z
      .string({ error: '消息内容必须是字符串' })
      .trim()
      .min(1, '消息内容不能为空')
      .max(100_000, '消息内容不能超过 100000 个字符'),
    knowledgeEnabled: z.boolean().optional().default(false),
    webSearchEnabled: z.boolean().optional().default(false),
  })
  .strict();
export type CreatePaiConversationRequest = z.infer<
  typeof createPaiConversationSchema
>;
export type ListPaiConversationsQuery = z.infer<
  typeof listPaiConversationsQuerySchema
>;
export type PaiConversationParams = z.infer<typeof paiConversationParamsSchema>;
export type UpdatePaiConversationRequest = z.infer<
  typeof updatePaiConversationSchema
>;
export type StartPaiRunRequest = z.infer<typeof startPaiRunSchema>;
