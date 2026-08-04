import { request } from '@umijs/max';
import {
  login as loginRequest,
  register as registerRequest,
} from './jushu-api/authentication';
import {
  getCurrentUser as getCurrentUserRequest,
  setDefaultOrganization as setDefaultOrganizationRequest,
} from './jushu-api/currentUser';

/**
 * GET /api/currentUser.organizations[].dataScopes 的元素。
 * DataScope 只描述 Organization 内的数据过滤范围，不参与顶栏工作区切换。
 */
export type DataScope = JushuAPI.DataScope;

/**
 * GET /api/currentUser.organizations 的元素。
 * permissions 与 skillCodes 都由后端按用户和 Organization 计算，前端不跨组织合并。
 */
export type OrganizationAccess = JushuAPI.OrganizationAccess;

/**
 * GET /api/currentUser 返回后存入 Umi initialState，并在当前登录期间共享。
 * 数据链路：OpenAPI -> npm run openapi:jushu -> JushuAPI.AuthCurrentUser
 * -> getInitialState.currentUser -> Workspace 规则、Sidebar、标签和业务页面。
 * Platform 和 Organization 是两个独立授权域，不能相互推导权限。
 */
export type AuthCurrentUser = JushuAPI.AuthCurrentUser;

/**
 * 认证接口统一使用的成功响应信封。
 */
export type ApiSuccess<T> = {
  success: true;
  data: T;
  traceId: string;
};

export type AuthLoginParams = JushuAPI.LoginRequest;
// export type AuthLoginData = JushuAPI.AuthLoginData;
export type RegisterParams = JushuAPI.RegisterRequest;
// export type RegisteredUser = JushuAPI.RegisteredUser;

export type ForgotPasswordResult = {
  accepted: true;
  expiresAt: string;
  developmentResetToken?: string;
};

export type ResetPasswordResult = {
  reset: true;
};

/** 当前退出响应会明确说明服务端是否实际撤销了 Access Token。 */
export type LogoutResult = {
  loggedOut: true;
  serverTokenRevoked: boolean;
};

type RequestError = Error & {
  request?: unknown;
  info?: {
    errorMessage?: string;
    traceId?: string;
  };
  response?: {
    status?: number;
    data?: {
      errorMessage?: string;
      traceId?: string;
    };
  };
};

export type AuthErrorDetails = {
  message: string;
  traceId?: string;
};

/** 将后端业务错误直接交给页面展示；仅在没有结构化错误时保留原始 Error.message。 */
export function getAuthErrorDetails(error: unknown): AuthErrorDetails {
  if (!(error instanceof Error)) return { message: '认证请求失败' };

  const requestError = error as RequestError;
  const backendMessage =
    requestError.info?.errorMessage ??
    requestError.response?.data?.errorMessage;
  const traceId =
    requestError.info?.traceId ?? requestError.response?.data?.traceId;

  if (backendMessage) return { message: backendMessage, traceId };

  if (requestError.request && !requestError.response) {
    return {
      message: '无法连接认证服务，请确认后端已经启动并检查网络连接',
    };
  }

  const responseStatus = requestError.response?.status;
  if (responseStatus && responseStatus >= 500) {
    return {
      message: `认证服务不可用（HTTP ${responseStatus}），请确认后端已经启动`,
    };
  }

  return {
    message: requestError.message,
    traceId,
  };
}

export type DefaultOrganizationResult =
  JushuAPI.SetDefaultOrganizationResponse;

export async function getCurrentUser(options?: {
  [key: string]: unknown;
}) {
  return getCurrentUserRequest(options);
}

export async function loginWithPassword(
  body: AuthLoginParams,
  options?: { [key: string]: unknown },
) {
  return loginRequest(body, options);
}

export async function registerAccount(
  body: RegisterParams,
  options?: { [key: string]: unknown },
) {
  return registerRequest(body, options);
}

export async function requestPasswordReset(
  email: string,
  options?: { [key: string]: unknown },
) {
  return request<ApiSuccess<ForgotPasswordResult>>('/api/password/forgot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: { email },
    ...(options || {}),
  });
}

export async function resetPassword(
  body: { token: string; password: string },
  options?: { [key: string]: unknown },
) {
  return request<ApiSuccess<ResetPasswordResult>>('/api/password/reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/**
 * 通知后端当前用户正在退出；调用方必须在 finally 中独立清理本地 Token。
 * 当前后端只确认请求，未来接入 Redis 后由 serverTokenRevoked 表示撤销结果。
 */
export async function logout(options?: { [key: string]: unknown }) {
  return request<ApiSuccess<LogoutResult>>('/api/login/outLogin', {
    method: 'POST',
    ...(options || {}),
  });
}

/**
 * 核心链路：页面选择 organizationId -> OpenAPI 生成请求 -> Bearer Token 用户
 * -> 后端实时 Organization Access 校验 -> 持久化默认组织。
 * 顶栏临时切换 Workspace 不调用本接口。
 */
export async function setDefaultOrganization(organizationId: string) {
  return setDefaultOrganizationRequest({ organizationId });
}
