import { z } from 'zod';

const username = z
  .string({ error: '用户名必须是字符串' })
  .trim()
  .min(3, '用户名至少需要 3 个字符')
  .max(64, '用户名不能超过 64 个字符')
  .regex(/^[a-zA-Z0-9._-]+$/, '用户名只能包含字母、数字、点、下划线和连字符')
  .transform((value) => value.toLowerCase());

const email = z
  .string({ error: '邮箱必须是字符串' })
  .trim()
  .email('邮箱格式不正确')
  .max(254, '邮箱不能超过 254 个字符')
  .transform((value) => value.toLowerCase());

const name = z
  .string({ error: '展示名称必须是字符串' })
  .trim()
  .min(1, '展示名称不能为空')
  .max(120, '展示名称不能超过 120 个字符');

const password = z
  .string({ error: '密码必须是字符串' })
  .min(12, '密码至少需要 12 个字符')
  .max(128, '密码不能超过 128 个字符');

export const registerSchema = z
  .object({
    username,
    email,
    name,
    password,
  })
  .strict();

export const loginSchema = z
  .object({
    account: z
      .string({ error: '账号必须是字符串' })
      .trim()
      .min(1, '账号不能为空')
      .max(254, '账号不能超过 254 个字符')
      .transform((value) => value.toLowerCase()),
    password: z
      .string({ error: '密码必须是字符串' })
      .min(1, '密码不能为空')
      .max(128, '密码不能超过 128 个字符'),
  })
  .strict();

export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
