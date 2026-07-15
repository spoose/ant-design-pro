import { request } from '@umijs/max';

/**
 * GET /api/currentUser 的 contexts 元素，描述用户在一个系统或部门范围内的权限。
 * 这是临时手写类型；后端 OpenAPI 包含 contexts 后应改用自动生成类型。
 */
export type AccessContext = {
  id: string;
  systemId: string;
  systemCode: string;
  systemName: string;
  scopeType: 'department' | 'system';
  scopeId?: string;
  scopeName?: string;
  // 当前阶段一个 page:* 权限码对应一个完整页面访问权，同时用于菜单和静态路由控制。
  permissions: string[];
  // 后端已按当前用户和 Context 过滤；当前仅作为 AI 能力占位展示。
  skillCodes: string[];
};

/**
 * GET /api/currentUser 返回后存入 Umi initialState，在当前登录期间共享。
 * 这是对自动生成 API.CurrentUser 的临时业务扩展；后端 OpenAPI 包含这些字段后应改用生成类型。
 */
export type AuthCurrentUser = API.CurrentUser & {
  defaultContextId?: string;
  contexts: AccessContext[];
};

/**
 * POST /api/login/account 的临时响应类型，只描述登录结果和 access token。
 * 用户资料统一由 /api/currentUser 获取；后端 OpenAPI 更新后应由生成的登录响应类型替代。
 */
export type AuthLoginResult = API.LoginResult & {
  accessToken?: string;
  tokenType?: 'Bearer';
  expiresIn?: number;
  expiresAt?: string;
};

/**
 * POST /api/auth/refresh 的预留响应类型，目前不接入应用启动或登录恢复链路。
 * 后端 refresh 接口和 OpenAPI 就绪后，再用生成类型替换并启用调用。
 */
export type RefreshTokenResult = {
  accessToken?: string;
  expiresIn?: number;
  user?: AuthCurrentUser;
};

/**
 * PUT /api/users/me/default-entry 的临时响应类型。
 * API 路径沿用现有后端命名，前端统一使用 context 术语；OpenAPI 更新后应由生成类型替代。
 */
export type DefaultContextResult = {
  success?: boolean;
  data?: {
    defaultContextId: string;
  };
  errorMessage?: string;
};

export async function loginWithPassword(
  body: API.LoginParams,
  options?: { [key: string]: unknown },
) {
  return request<AuthLoginResult>('/api/login/account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}


//
export async function refreshAccessToken(options?: { [key: string]: unknown }) {
  return request<RefreshTokenResult>('/api/auth/refresh', {
    method: 'POST',
    withCredentials: true,
    skipErrorHandler: true,
    ...(options || {}),
  });
}

export async function logout(options?: { [key: string]: unknown }) {
  return request<Record<string, unknown>>('/api/login/outLogin', {
    method: 'POST',
    ...(options || {}),
  });
}

//默认系统选项
export async function setDefaultContext(contextId: string) {
  return request<DefaultContextResult>('/api/users/me/default-entry', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data: { entryId: contextId },
  });
}
