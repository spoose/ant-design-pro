import { request } from '@umijs/max';
import {
  login as loginRequest,
  register as registerRequest,
} from './jushu-api/authentication';
import {
  getCurrentUser as getCurrentUserRequest,
  setDefaultOrganization as setDefaultOrganizationRequest,
} from './jushu-api/currentUser';

export type {
  AuthCurrentUser,
  AuthSession,
  DataScope,
  OrganizationAccess,
} from './auth-model';

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
  code?: string | number;
  request?: unknown;
  info?: {
    errorCode?: string;
    errorMessage?: string;
    traceId?: string;
  };
  response?: {
    status?: number;
    data?: {
      errorCode?: string;
      errorMessage?: string;
      traceId?: string;
    };
  };
};

export type AuthErrorDetails = {
  message: string;
  traceId?: string;
  code?: string | number;
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
  // XOneAuthBackendError 直接携带数字业务码；Legacy 错误仍使用信封中的 errorCode。
  const code =
    requestError.code ??
    requestError.info?.errorCode ??
    requestError.response?.data?.errorCode;

  if (backendMessage) return { message: backendMessage, traceId, code };

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
    code,
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
