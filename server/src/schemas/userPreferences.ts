import { z } from 'zod';

export const setDefaultOrganizationSchema = z
  .object({
    organizationId: z.uuid('organizationId 必须是有效 UUID'),
  })
  .strict();

const profileName = z
  .string({ error: '展示名称必须是字符串' })
  .trim()
  .min(1, '展示名称不能为空')
  .max(120, '展示名称不能超过 120 个字符');

const profileAvatar = z
  .string({ error: '头像地址必须是字符串' })
  .trim()
  .max(2048, '头像地址不能超过 2048 个字符')
  .refine(
    (value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: '头像地址必须是有效的 http(s) URL' },
  );

export const updateCurrentUserProfileSchema = z
  .object({
    name: profileName.optional(),
    avatar: z.union([profileAvatar, z.null()]).optional(),
  })
  .strict()
  .refine((value) => value.name !== undefined || value.avatar !== undefined, {
    message: '至少需要提供 name 或 avatar',
  });

export type SetDefaultOrganizationRequest = z.infer<
  typeof setDefaultOrganizationSchema
>;
export type UpdateCurrentUserProfileRequest = z.infer<
  typeof updateCurrentUserProfileSchema
>;
