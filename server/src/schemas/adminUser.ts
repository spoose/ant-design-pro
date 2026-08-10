import { z } from 'zod';

export const adminUserListBodySchema = z
  .object({
    page: z.number().int().min(1).max(1_000_000),
    pageSize: z.number().int().min(1).max(100),
    keyword: z.string().trim().min(1).max(120).optional(),
    status: z.enum(['active', 'disabled', 'deleted']).optional(),
    sortBy: z
      .enum(['username', 'email', 'name', 'status', 'createdAt'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export type AdminUserListRequest = z.infer<typeof adminUserListBodySchema>;

export const setAdminUserOrganizationsBodySchema = z
  .object({
    userId: z.uuid('userId 必须是有效 UUID'),
    organizationIds: z
      .array(z.uuid('organizationIds 必须只包含有效 UUID'))
      .min(1, '请至少选择一个组织')
      .max(100, 'organizationIds 不能超过 100 项')
      .refine(
        (organizationIds) =>
          new Set(organizationIds).size === organizationIds.length,
        'organizationIds 不能包含重复项',
      ),
  })
  .strict();

export type SetAdminUserOrganizationsRequest = z.infer<
  typeof setAdminUserOrganizationsBodySchema
>;

export const setAdminUserStatusBodySchema = z
  .object({
    userId: z.uuid('userId 必须是有效 UUID'),
    status: z.enum(['active', 'disabled']),
  })
  .strict();

export type SetAdminUserStatusRequest = z.infer<
  typeof setAdminUserStatusBodySchema
>;
