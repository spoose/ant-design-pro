import { request } from '@umijs/max';

/**
 * GET /api/currentUser.organizations[].dataScopes 的元素。
 * DataScope 只描述 Organization 内的数据过滤范围，不参与顶栏工作区切换。
 */
export type DataScope = {
  /** 后端生成的稳定范围 ID，业务请求需要限定数据范围时使用。 */
  dataScopeId: string;
  /** 便于日志、配置和排查的稳定业务编码。 */
  dataScopeCode: string;
  /** 面向用户展示的数据范围名称。 */
  dataScopeName: string;
  /** 后端定义的范围层级；前端不根据该字段推导权限。 */
  type: 'organization' | 'department' | 'team' | 'project' | 'custom';
};

/**
 * GET /api/currentUser.organizations 的元素。
 * permissions 与 skillCodes 都由后端按用户和 Organization 计算，前端不跨组织合并。
 */
export type OrganizationAccess = {
  /** Organization 的稳定 ID，也是组织 Workspace URL 的 :organizationId 来源。 */
  organizationId: string;
  /** 用于徽标、日志和配置的稳定业务编码。 */
  organizationCode: string;
  /** 组织切换菜单和页面标题使用的展示名称。 */
  organizationName: string;
  /** 后端计算的组织权限码；Sidebar 和页面入口只在当前组织内消费。 */
  permissions: string[];
  /** 后端过滤后的可用 App/Skill Code；用于首页卡片、标签与路由校验。 */
  skillCodes: string[];
  /** 当前组织内可用的数据范围，不会生成独立 Workspace 或标签。 */
  dataScopes: DataScope[];
  /** 后端保存的组织内默认数据范围；当前标签实现暂不消费。 */
  defaultDataScopeId?: string;
};

/**
 * GET /api/currentUser 返回后存入 Umi initialState，并在当前登录期间共享。
 * 这是对自动生成 API.CurrentUser 的临时业务扩展；后端 OpenAPI 包含这些字段后，
 * 应运行 `npm run openapi`，改用生成类型并删除这里对应的手写结构。
 *
 * 数据链路：后端 OpenAPI -> npm run openapi -> API.CurrentUser
 * -> getInitialState.currentUser -> Workspace 规则、Sidebar、标签和业务页面。
 * Platform 和 Organization 是两个独立授权域，不能相互推导权限。
 */
export type AuthCurrentUser = Omit<API.CurrentUser, 'userid'> & {
  /** 后端用户主键；业务代码不再读取旧字段 userid。 */
  userId: string;
  /** Platform 控制面权限，只用于 Platform 页面、菜单和操作。 */
  platformPermissions: string[];
  /** Platform Scope 内可打开的 App/Skill Code。 */
  platformSkillCodes: string[];
  /** 非 Platform 用户的长期默认组织，由后端保存。 */
  defaultOrganizationId?: string | null;
  /** 当前用户可以真正进入的组织；不等同于 Super Admin 可管理的组织全集。 */
  organizations: OrganizationAccess[];
};

/**
 * 认证接口统一使用的成功响应信封。
 */
export type ApiSuccess<T> = {
  success: true;
  data: T;
  traceId: string;
};

export type AuthLoginParams = {
  /** 后端同时接受用户名或邮箱，不再发送旧字段 username/type/autoLogin。 */
  account: string;
  password: string;
};

export type AuthLoginData = {
  /** 后端签发的 Bearer Token，写入 authToken 后由请求拦截器附加到 API 请求。 */
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: string;
};

export type RegisterParams = {
  username: string;
  email: string;
  name: string;
  password: string;
};

export type RegisteredUser = {
  userId: string;
  username: string;
  email: string;
  name: string;
  status: 'active';
  createdAt: string;
};

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

/**
 * PUT /api/users/me/default-organization 的临时响应类型；OpenAPI 就绪后改用生成类型。
 */
export type DefaultOrganizationResult = {
  success?: boolean;
  data?: {
    defaultOrganizationId: string;
  };
  errorMessage?: string;
};

export async function loginWithPassword(
  body: AuthLoginParams,
  options?: { [key: string]: unknown },
) {
  return request<ApiSuccess<AuthLoginData>>('/api/login/account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

export async function registerAccount(
  body: RegisterParams,
  options?: { [key: string]: unknown },
) {
  return request<ApiSuccess<RegisteredUser>>('/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
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

/** 只在用户明确设置长期默认组织时调用；顶栏临时切换不调用。 */
export async function setDefaultOrganization(organizationId: string) {
  return request<DefaultOrganizationResult>(
    '/api/users/me/default-organization',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      data: { organizationId },
    },
  );
}
