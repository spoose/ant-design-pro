import { z } from 'zod';

const organizationCode = z
  .string({ error: '组织编码必须是字符串' })
  .trim()
  .min(2, '组织编码至少需要 2 个字符')
  .max(64, '组织编码不能超过 64 个字符')
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
    '组织编码只能包含字母、数字、下划线和连字符',
  )
  .transform((value) => value.toUpperCase());

const organizationName = z
  .string({ error: '组织名称必须是字符串' })
  .trim()
  .min(1, '组织名称不能为空')
  .max(120, '组织名称不能超过 120 个字符');

const organizationStatus = z.enum(['active', 'disabled'], {
  error: '组织状态必须是 active 或 disabled',
});

export const createOrganizationSchema = z
  .object({
    organizationCode,
    organizationName,
    status: organizationStatus,
  })
  .strict();

export const updateOrganizationCommandSchema = z
  .object({
    organizationId: z.uuid('organizationId 必须是有效 UUID'),
    organizationName: organizationName.optional(),
    status: organizationStatus.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.organizationName !== undefined || value.status !== undefined,
    { message: '至少需要提交一个可更新字段' },
  );

export const deleteOrganizationCommandSchema = z
  .object({
    organizationId: z.uuid('organizationId 必须是有效 UUID'),
  })
  .strict();

export type CreateOrganizationRequest = z.infer<
  typeof createOrganizationSchema
>;
export type UpdateOrganizationCommandRequest = z.infer<
  typeof updateOrganizationCommandSchema
>;
export type DeleteOrganizationCommandRequest = z.infer<
  typeof deleteOrganizationCommandSchema
>;
