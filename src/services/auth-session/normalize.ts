import { ALL_APP_CODES } from '@/config/appCodes';
import type { AuthCurrentUser, OrganizationAccess } from '../auth-model';
import type { AuthBackendIdentitySnapshot } from '../auth-backends';
import {
  assertXoneTokenSubject,
  XoneTokenClaimsError,
} from './xoneTokenClaims';

/** XOne 当前阶段明确使用的登录身份；不是接口失败后的备用身份。 */
export type XoneSessionIdentity = {
  userId?: string;
  projectId?: string;
  identifier?: string;
};

/**
 * XOne 离线阶段唯一的 Project Admin 身份。
 * 新后端开放用户角色后删除此映射，改由后端返回的 Project 角色决定 isSuperAdmin。
 */
const XONE_OFFLINE_PROJECT_ADMIN_IDENTITY = {
  projectId: '1111',
  userId: '1',
} as const;

/** 集约运维是所有用户的基础应用，不依赖后端应用授权。 */
const UNIVERSAL_APP_CODE = 'integrated-operations';
const withUniversalApp = (appCodes: string[]) => [
  UNIVERSAL_APP_CODE,
  ...appCodes.filter((appCode) => appCode !== UNIVERSAL_APP_CODE),
];
const toOptionalString = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
};

/**
 * XOne 组织 -> 页面 OrganizationAccess。
 * 当前临时策略只开放 Organization 应用；Platform 权限不会从组织权限反推。
 */
const normalizeXoneOrganizations = (
  snapshot: Extract<AuthBackendIdentitySnapshot, { source: 'xone' }>,
): OrganizationAccess[] =>
  snapshot.organizations.map((organization) => {
    const organizationId = String(organization.id);
    const organizationCode =
      toOptionalString(organization.organizationCode) ??
      `ORG-${organizationId}`;
    const organizationName =
      toOptionalString(organization.organizationName) ?? organizationCode;
    return {
      organizationId,
      organizationCode,
      organizationName,
      // '*' 只表示当前 Organization 内临时全开，不授予 Platform 管理权限。
      permissions: ['*'],
      appCodes: [...ALL_APP_CODES],
      dataScopes: [
        {
          dataScopeId: organizationId,
          dataScopeCode: organizationCode,
          dataScopeName: organizationName,
          type: 'organization',
        },
      ],
      defaultDataScopeId: organizationId,
    };
  });

/** Legacy API 已直接返回 app 字段；这里只追加所有用户共有的基础应用。 */
const normalizeLegacyCurrentUser = (
  currentUser: JushuAPI.AuthCurrentUser,
): AuthCurrentUser => {
  return {
    ...currentUser,
    projectAppCodes: withUniversalApp([...currentUser.projectAppCodes]),
    organizations: currentUser.organizations.map((organization) => ({
      ...organization,
      appCodes: withUniversalApp([...organization.appCodes]),
    })),
  };
};

/**
 * XOne getCurrentUser 尚未开放，userId/projectId 延续登录 Token 已验证并持久化的身份。
 * 当前 Token 的 sub 必须与 identifier 一致；任一字段缺失时直接报错。
 */
const normalizeXoneIdentity = (
  sessionIdentity: XoneSessionIdentity | undefined,
  accessToken?: string,
) => {
  const userId = toOptionalString(sessionIdentity?.userId);
  const projectId = toOptionalString(sessionIdentity?.projectId);
  const identifier = toOptionalString(sessionIdentity?.identifier);
  const missingFields = [
    !userId && 'userId',
    !projectId && 'projectId',
    !identifier && 'identifier',
  ].filter(Boolean);
  if (!userId || !projectId || !identifier) {
    throw new XoneTokenClaimsError(
      `XOne 会话缺少 ${missingFields.join('、')}，请重新登录`,
    );
  }
  assertXoneTokenSubject(accessToken, identifier);
  return {
    userId,
    projectId,
    username: identifier,
  };
};

/**
 * 将 Backend 来源快照转换成页面唯一认可的 AuthCurrentUser。
 * Legacy 保持原数据；XOne 显式挑选安全字段，因此 credential 不可能进入结果。
 */
export const normalizeAuthCurrentUser = (
  snapshot: AuthBackendIdentitySnapshot,
  accessToken?: string,
  xoneSessionIdentity?: XoneSessionIdentity,
): AuthCurrentUser => {
  if (snapshot.source === 'legacy') {
    return normalizeLegacyCurrentUser(snapshot.currentUser);
  }

  const identity = normalizeXoneIdentity(
    xoneSessionIdentity,
    accessToken,
  );
  // 当前固定测试账号临时承担 Project Admin；不会把所有 XOne 用户默认提升为管理员。
  const isProjectAdmin =
    identity.projectId === XONE_OFFLINE_PROJECT_ADMIN_IDENTITY.projectId &&
    identity.userId === XONE_OFFLINE_PROJECT_ADMIN_IDENTITY.userId;
  const organizations = normalizeXoneOrganizations(snapshot);
  const defaultOrganizationId =
    snapshot.organizations.find((organization) => organization.defaultFlag)
      ?.id ?? null;

  return {
    projectId: identity.projectId,
    userId: identity.userId,
    username: identity.username,
    name: identity.username,
    email: '',
    avatar: null,
    status: 'active',
    // 旧模型的 isSuperAdmin 暂时承载 Project Admin；后续只需在适配层替换数据来源。
    isSuperAdmin: isProjectAdmin,
    // Project Admin 暂时全权复用已有管理菜单；普通用户不会因应用全开获得管理权限。
    platformPermissions: isProjectAdmin ? ['*'] : [],
    // XOne 尚未提供应用授权字段；离线开发阶段按约定为每个 Project 默认开放全部应用。
    projectAppCodes: [...ALL_APP_CODES],
    defaultOrganizationId:
      defaultOrganizationId === null ? null : String(defaultOrganizationId),
    organizations,
  };
};
