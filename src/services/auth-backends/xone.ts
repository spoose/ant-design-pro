import { login as xoneLogin } from '../xone-api/authentication';
import {
  listOrganizations,
  selectAndChangeOrganization,
} from '../xone-api/organization';
import type { XoneResult } from '../xone-api/types';
import type {
  AuthBackend,
  AuthBackendLoginResult,
  AuthBackendRequestOptions,
} from './types';

/** XOne 业务错误；保留业务码供第 4 步统一接入全局错误展示。 */
export class XoneAuthBackendError extends Error {
  readonly code: number;

  constructor(
    operation: string,
    response: Pick<XoneResult<unknown>, 'code' | 'msg'>,
  ) {
    super(response.msg || `${operation}失败`);
    this.name = 'XoneAuthBackendError';
    this.code = response.code;
  }
}

/** 统一校验 XOne 的 code=200 业务成功规则，避免 HTTP 200 掩盖业务失败。 */
const assertXoneSuccess = <T>(operation: string, response: XoneResult<T>) => {
  if (response.code !== 200) {
    throw new XoneAuthBackendError(operation, response);
  }
  return response.data;
};

/** Token 是后续请求的唯一认证凭证，成功响应缺失 Token 时必须立即失败。 */
const requireAccessToken = (
  operation: string,
  data: { token?: string },
): AuthBackendLoginResult => {
  if (!data.token) {
    throw new Error(`${operation}成功但未返回 Token`);
  }
  return { accessToken: data.token, tokenType: 'Bearer' };
};

export const xoneAuthBackend: AuthBackend = {
  kind: 'xone',

  /** 核心链路：统一登录参数 -> XOne LoginRequest -> 标准 accessToken。 */
  async login(input, options) {
    if (!Number.isSafeInteger(input.projectId)) {
      throw new Error('XOne 登录必须提供有效的 projectId');
    }
    const response = await xoneLogin(
      {
        projectId: input.projectId as number,
        authType: input.authType,
        identifier: input.username,
        credential: input.password,
      },
      options,
    );
    return requireAccessToken(
      'XOne 登录',
      assertXoneSuccess('XOne 登录', response),
    );
  },

  /**
   * 核心链路：Bearer Token -> listOrgs -> 当前 Project 的组织原始数据。
   * XOne getCurrentUser 尚未开放；userId/projectId/sub 来自已验证的登录 Token 会话。
   */
  async loadCurrentUser(options?: AuthBackendRequestOptions) {
    const organizationsResponse = await listOrganizations(options);
    return {
      source: 'xone' as const,
      // 登录 Token 若返回空 data，则当前用户没有可进入的组织；组织 Token 不走此函数。
      organizations:
        assertXoneSuccess('XOne 组织列表查询', organizationsResponse) ?? [],
    };
  },

  /** 核心链路：目标 organizationId -> XOne organizationId -> 新 accessToken。 */
  async switchOrganization(organizationId, options) {
    // XOne OpenAPI 将 organizationId 定义为整数；页面模型中的字符串 ID 只在请求边界转换。
    const orgId = Number(organizationId);
    if (!Number.isSafeInteger(orgId)) {
      throw new Error('XOne 组织 ID 必须是安全整数');
    }
    const response = await selectAndChangeOrganization(
      { organizationId: orgId },
      options,
    );
    const tokenResult = requireAccessToken(
      'XOne 组织切换',
      assertXoneSuccess('XOne 组织切换', response),
    );
    return { organizationId, accessToken: tokenResult.accessToken };
  },
};
