import { z } from 'zod';

const email = z
  .string({ error: '邮箱必须是字符串' })
  .trim()
  .email('邮箱格式不正确')
  .max(254, '邮箱不能超过 254 个字符')
  .transform((value) => value.toLowerCase());

const password = z
  .string({ error: '密码必须是字符串' })
  .min(12, '密码至少需要 12 个字符')
  .max(128, '密码不能超过 128 个字符');

export const forgotPasswordSchema = z
  .object({
    email,
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z
      .string({ error: '重置 Token 必须是字符串' })
      .trim()
      .min(32, '重置 Token 格式不正确')
      .max(512, '重置 Token 格式不正确'),
    password,
  })
  .strict();

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
