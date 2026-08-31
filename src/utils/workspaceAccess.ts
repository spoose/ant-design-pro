import { getAppDefinition } from '@/config/appRegistry';
import type { AuthCurrentUser, AuthSession } from '@/services/auth';
import {
  getOrganizationAppPagePath,
  getOrganizationStatsPagePath,
  getPlatformAppPagePath,
  getPlatformHomePath,
  getPlatformPagePath,
  getPlatformStatsPagePath,
  getWorkspaceAppKey,
  getWorkspaceAppPageKey,
  getWorkspaceOrganizationId,
  getWorkspaceOrganizationPageKey,
  getWorkspacePlatformPageKey,
  getWorkspaceStatsPageKey,
  isPlatformWorkspacePath,
  isStatsPageKey,
  isWorkspaceStatsPath,
  type OrganizationPageKey,
  type PlatformPageKey,
} from './workspaceRoutes';
import { getOrganizationAccess, getPlatformAccess } from './workspaceRules';

export type WorkspaceRouteDecision =
  | { kind: 'allow' }
  | { kind: 'redirect'; to: string }
  | { kind: 'forbidden' }
  | { kind: 'not-found' };

const platformPageKeys = new Set<PlatformPageKey>([
  'overview',
  'organizations',
  'users',
  'permissions',
  'logs',
  'system',
]);
const organizationPageKeys = new Set<OrganizationPageKey>([
  'home',
  'members',
  'roles',
  'settings',
]);

const isPlatformPageKey = (
  pageKey: string | undefined,
): pageKey is PlatformPageKey =>
  Boolean(pageKey && platformPageKeys.has(pageKey as PlatformPageKey));

const isOrganizationPageKey = (
  pageKey: string | undefined,
): pageKey is OrganizationPageKey =>
  Boolean(pageKey && organizationPageKeys.has(pageKey as OrganizationPageKey));

/**
 * Workspace URL 的纯规则层。
 *
 * 输入来源：统一认证会话 + Umi pathname。
 * 输出消费：WorkspaceAccess wrapper 决定渲染、规范化跳转、403 或 404。
 * 后端仍必须对每个业务 API 进行真实授权，本函数只负责前端导航边界。
 */
export const resolveWorkspaceRouteDecision = (
  user: AuthCurrentUser,
  pathname: string,
  session?: Pick<AuthSession, 'activeOrganizationId' | 'backend'>,
): WorkspaceRouteDecision => {
  const appKey = getWorkspaceAppKey(pathname);

  // XOne Organization URL 必须与 Token 中已恢复的活动组织一致，禁止手改 URL 绕过换 Token。
  const organizationId = getWorkspaceOrganizationId(pathname);
  if (
    session?.backend === 'xone' &&
    organizationId &&
    organizationId !== session.activeOrganizationId
  ) {
    return { kind: 'redirect', to: getPlatformHomePath() };
  }

  if (isPlatformWorkspacePath(pathname)) {
    const access = getPlatformAccess(user);

    if (appKey) {
      const definition = getAppDefinition(appKey);
      if (!definition) return { kind: 'not-found' };
      if (!access.canUseApp(appKey)) return { kind: 'forbidden' };

      const pageKey = getWorkspaceAppPageKey(pathname);
      if (!pageKey) {
        return {
          kind: 'redirect',
          to: getPlatformAppPagePath(appKey, 'overview'),
        };
      }
      return definition.navigation.some((item) => item.pathSegment === pageKey)
        ? { kind: 'allow' }
        : { kind: 'not-found' };
    }

    if (isWorkspaceStatsPath(pathname)) {
      if (!access.canViewStats) return { kind: 'forbidden' };
      const statsPageKey = getWorkspaceStatsPageKey(pathname);
      if (!statsPageKey) {
        return {
          kind: 'redirect',
          to: getPlatformStatsPagePath('users'),
        };
      }
      return isStatsPageKey(statsPageKey)
        ? { kind: 'allow' }
        : { kind: 'not-found' };
    }

    const pageKey = getWorkspacePlatformPageKey(pathname);
    if (!isPlatformPageKey(pageKey)) return { kind: 'not-found' };
    if (pageKey === 'system') {
      if (access.canViewPlatformAudit) {
        return { kind: 'redirect', to: getPlatformPagePath('logs') };
      }
      if (access.canManagePlatformUsers) {
        return { kind: 'redirect', to: getPlatformPagePath('users') };
      }
      return { kind: 'forbidden' };
    }
    return access.visibleMenuKeys.includes(pageKey)
      ? { kind: 'allow' }
      : { kind: 'forbidden' };
  }

  if (!organizationId) return { kind: 'not-found' };

  const access = getOrganizationAccess(user, organizationId);
  // currentUser 只包含可进入组织，无法安全区分“不存在”和“不可见”。
  if (!access.organization) return { kind: 'forbidden' };

  if (appKey) {
    const definition = getAppDefinition(appKey);
    if (!definition) return { kind: 'not-found' };
    if (!access.canUseApp(appKey)) return { kind: 'forbidden' };

    const pageKey = getWorkspaceAppPageKey(pathname);
    if (!pageKey) {
      return {
        kind: 'redirect',
        to: getOrganizationAppPagePath(organizationId, appKey, 'overview'),
      };
    }
    return definition.navigation.some((item) => item.pathSegment === pageKey)
      ? { kind: 'allow' }
      : { kind: 'not-found' };
  }

  if (isWorkspaceStatsPath(pathname)) {
    if (!access.canViewStats) return { kind: 'forbidden' };
    const statsPageKey = getWorkspaceStatsPageKey(pathname);
    if (!statsPageKey) {
      return {
        kind: 'redirect',
        to: getOrganizationStatsPagePath(organizationId, 'users'),
      };
    }
    return isStatsPageKey(statsPageKey)
      ? { kind: 'allow' }
      : { kind: 'not-found' };
  }

  const pageKey = getWorkspaceOrganizationPageKey(pathname);
  if (!isOrganizationPageKey(pageKey)) return { kind: 'not-found' };
  return access.visibleMenuKeys.includes(pageKey)
    ? { kind: 'allow' }
    : { kind: 'forbidden' };
};
