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
export type AuthCurrentUser = API.CurrentUser & {
  /** Platform 控制面权限，只用于 Platform 页面、菜单和操作。 */
  platformPermissions: string[];
  /** Platform Scope 内可打开的 App/Skill Code。 */
  platformSkillCodes: string[];
  /** 非 Platform 用户的长期默认组织，由后端保存。 */
  defaultOrganizationId?: string;
  /** 当前用户可以真正进入的组织；不等同于 Super Admin 可管理的组织全集。 */
  organizations: OrganizationAccess[];
};

/**
 * POST /api/login/account 的临时 Bearer-only 响应类型。
 * 登录页保存 accessToken 后重新请求 /api/currentUser；OpenAPI 就绪后改用生成类型。
 */
export type AuthLoginResult = API.LoginResult & {
  /** 后端签发的 Bearer Token，写入 authToken 后由请求拦截器附加到 API 请求。 */
  accessToken?: string;
  /** 当前只接受 Bearer，避免调用方猜测认证方案。 */
  tokenType?: 'Bearer';
  /** Token 相对有效期；当前阶段不实现自动刷新。 */
  expiresIn?: number;
  /** 后端可选的绝对过期时间。 */
  expiresAt?: string;
};

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

export async function logout(options?: { [key: string]: unknown }) {
  return request<Record<string, unknown>>('/api/login/outLogin', {
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
