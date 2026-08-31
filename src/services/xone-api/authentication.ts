import { request } from '@umijs/max';
import type {
  XoneLoginData,
  XoneLoginRequest,
  XoneResult,
} from './types';

/** 原样调用 XOne 登录接口，不在传输层重命名 token 或登录字段。 */
export async function login(
  body: XoneLoginRequest,
  options?: Record<string, unknown>,
) {
  return request<XoneResult<XoneLoginData>>('/web/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options ?? {}),
  });
}
