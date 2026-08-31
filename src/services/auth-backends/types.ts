import type { XoneOrganization } from '../xone-api/types';

/** 构建时可选的认证后端；页面与 Workspace 不读取该变量。 */
export type AuthBackendKind = 'legacy' | 'xone';

/** 页面友好的统一登录参数；只有 XOne 使用 projectId，老 API 会明确忽略它。 */
export type AuthBackendLoginInput = {
  projectId?: number;
  /** 当前前端只开发账号密码登录；未来增加验证码登录时应扩展为联合类型。 */
  authType: 'password';
  username: string;
  password: string;
};

/** 两套后端都向上返回相同的 Bearer Token 结构。 */
export type AuthBackendLoginResult = {
  accessToken: string;
  tokenType: 'Bearer';
};

/**
 * Backend 层只加载会话刷新数据，不直接生成页面使用的 AuthCurrentUser。
 * XOne 当前仅返回 listOrgs；已验证身份来自登录 Token 和最小会话 metadata。
 */
export type AuthBackendIdentitySnapshot =
  | {
      source: 'legacy';
      currentUser: JushuAPI.AuthCurrentUser;
    }
  | {
      source: 'xone';
      organizations: XoneOrganization[];
    };

/**
 * XOne 切换组织时返回新 Token；老 API 只更新默认组织，因此 accessToken 为空。
 * 页面以后只消费这个统一结果，不判断后端类型。
 */
export type AuthBackendSwitchResult = {
  organizationId: string;
  accessToken?: string;
};

export type AuthBackendRequestOptions = Record<string, unknown>;

/**
 * 当前“登录会话”阶段的公共边界，只覆盖登录、加载身份上下文、切换组织三项能力。
 * loadCurrentUser 是兼容两套后端的领域名称：Legacy 调 currentUser，XOne 当前只调 listOrgs；
 * 注册、登出、找回密码和用户管理尚未纳入该边界。
 */
export interface AuthBackend {
  readonly kind: AuthBackendKind;
  login(
    input: AuthBackendLoginInput,
    options?: AuthBackendRequestOptions,
  ): Promise<AuthBackendLoginResult>;
  loadCurrentUser(
    options?: AuthBackendRequestOptions,
  ): Promise<AuthBackendIdentitySnapshot>;
  switchOrganization(
    organizationId: string,
    options?: AuthBackendRequestOptions,
  ): Promise<AuthBackendSwitchResult>;
}
