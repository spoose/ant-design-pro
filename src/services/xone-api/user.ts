import { request } from '@umijs/max';
import type { XoneCurrentUserData, XoneResult } from './types';

/**
 * 查询当前 Token 对应的用户和角色原始数据。
 * 历史内网响应出现过 data=null，因此返回类型明确保留 null。
 */
export async function getCurrentUser(options?: Record<string, unknown>) {
  return request<XoneResult<XoneCurrentUserData>>(
    '/web/system/user/getCurrentUser',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {},
      ...(options ?? {}),
    },
  );
}
