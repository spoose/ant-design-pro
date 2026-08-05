import { z } from 'zod';

const positiveInteger = (field: string, maximum: number) =>
  z
    .string({ error: `${field} 必须是字符串形式的整数` })
    .regex(/^\d+$/, `${field} 必须是正整数`)
    .transform(Number)
    .pipe(
      z
        .number()
        .int(`${field} 必须是整数`)
        .min(1, `${field} 必须大于等于 1`)
        .max(maximum, `${field} 不能大于 ${maximum}`),
    );

export const adminUserListQuerySchema = z
  .object({
    page: positiveInteger('page', 1_000_000),
    pageSize: positiveInteger('pageSize', 100),
    keyword: z.string().trim().min(1).max(120).optional(),
    status: z.enum(['active', 'disabled', 'deleted']).optional(),
    sortBy: z
      .enum(['username', 'email', 'name', 'status', 'createdAt'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
