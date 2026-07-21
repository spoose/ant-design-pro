import { getSkillDefinition } from '@/config/skillRegistry';
import type { AuthCurrentUser } from '@/services/auth';
import {
  getOrganizationAppPagePath,
  getPlatformAppPagePath,
  getWorkspaceAppKey,
  getWorkspaceAppPageKey,
  getWorkspaceOrganizationId,
  getWorkspaceOrganizationPageKey,
  getWorkspacePlatformPageKey,
  isPlatformWorkspacePath,
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
 * 输入来源：GET /api/currentUser + Umi pathname。
 * 输出消费：WorkspaceAccess wrapper 决定渲染、规范化跳转、403 或 404。
 * 后端仍必须对每个业务 API 进行真实授权，本函数只负责前端导航边界。
 */
export const resolveWorkspaceRouteDecision = (
  user: AuthCurrentUser,
  pathname: string,
): WorkspaceRouteDecision => {
  const appKey = getWorkspaceAppKey(pathname);

  if (isPlatformWorkspacePath(pathname)) {
    const access = getPlatformAccess(user);
    if (!access.canEnterManagementCenter) return { kind: 'forbidden' };

    if (appKey) {
      const definition = getSkillDefinition(appKey);
      if (!definition) return { kind: 'not-found' };
      if (!access.canUseSkill(appKey)) return { kind: 'forbidden' };

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

    const pageKey = getWorkspacePlatformPageKey(pathname);
    if (!isPlatformPageKey(pageKey)) return { kind: 'not-found' };
    return access.visibleMenuKeys.includes(pageKey)
      ? { kind: 'allow' }
      : { kind: 'forbidden' };
  }

  const organizationId = getWorkspaceOrganizationId(pathname);
  if (!organizationId) return { kind: 'not-found' };

  const access = getOrganizationAccess(user, organizationId);
  // currentUser 只包含可进入组织，无法安全区分“不存在”和“不可见”。
  if (!access.organization) return { kind: 'forbidden' };

  if (appKey) {
    const definition = getSkillDefinition(appKey);
    if (!definition) return { kind: 'not-found' };
    if (!access.canUseSkill(appKey)) return { kind: 'forbidden' };

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

  const pageKey = getWorkspaceOrganizationPageKey(pathname);
  if (!isOrganizationPageKey(pageKey)) return { kind: 'not-found' };
  return access.visibleMenuKeys.includes(pageKey)
    ? { kind: 'allow' }
    : { kind: 'forbidden' };
};
