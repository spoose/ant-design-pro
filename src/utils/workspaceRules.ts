import type { AuthCurrentUser, OrganizationAccess } from '@/services/auth';

/** Platform 固定首页侧栏的稳定菜单标识。 */
export type PlatformMenuKey =
  /** 所有已认证用户都能访问的 Project 工作台。 */
  | 'overview'
  /** 全部 Organization 的平台级管理页。 */
  | 'organizations'
  /** 跨 Organization 的平台人员管理页。 */
  | 'users'
  /** Platform 权限配置页。 */
  | 'permissions'
  /** 系统日志页。 */
  | 'logs';

/** Organization 固定首页侧栏的稳定菜单标识。 */
export type OrganizationMenuKey =
  /** 当前 Organization 首页及 App 入口。 */
  | 'home'
  /** 当前 Organization 成员管理。 */
  | 'members'
  /** 当前 Organization 角色与授权管理。 */
  | 'roles'
  /** 当前 Organization 设置。 */
  | 'settings';

/** 由当前认证用户派生的 Project 首页与 Platform 管理授权画像。 */
export type PlatformAccess = {
  /** POST /api/currentUser/get 返回的 platformPermissions 防御性副本。 */
  permissions: string[];
  /** 当前 Project 可用应用代码的防御性副本。 */
  availableAppCodes: string[];
  /** 是否至少拥有一个 Platform 管理权限；不再控制公共工作台。 */
  canEnterManagementCenter: boolean;
  /** 是否显示并允许进入组织管理。 */
  canManageOrganizations: boolean;
  /** 是否显示并允许进入平台人员管理。 */
  canManagePlatformUsers: boolean;
  /** 是否显示并允许进入平台权限管理。 */
  canGrantPlatformPermissions: boolean;
  /** 是否具备平台审计查看能力。 */
  canViewPlatformAudit: boolean;
  /** 是否可进入独立统计路由；首页公共图表不读取该权限。 */
  canViewStats: boolean;
  /** 由上述布尔能力按固定顺序生成的 Platform Sidebar Key。 */
  visibleMenuKeys: PlatformMenuKey[];
  /** 供页面按钮和操作入口复用的 Platform 权限判断函数。 */
  hasPermission: (permission: string) => boolean;
  /** 判断 Project 公共区域内是否可打开指定应用标签。 */
  canUseApp: (appCode: string) => boolean;
};

/** 指定 Organization 的前端授权画像；不会读取其他 Organization 或 Platform 权限。 */
export type ResolvedOrganizationAccess = {
  /** URL organizationId 是否命中 currentUser.organizations 白名单。 */
  accessible: boolean;
  /** 命中时返回原始 Organization 授权记录。 */
  organization?: OrganizationAccess;
  /** 当前 Organization permissions 的防御性副本。 */
  permissions: string[];
  /** 当前 Organization appCodes 的防御性副本。 */
  availableAppCodes: string[];
  /** 是否允许管理当前 Organization 成员。 */
  canManageMembers: boolean;
  /** 是否允许管理当前 Organization 角色或授权。 */
  canManageRoles: boolean;
  /** 是否允许修改当前 Organization 设置。 */
  canUpdateSettings: boolean;
  /** 是否可查看本组织统计；任一组织管理能力即可。 */
  canViewStats: boolean;
  /** 由当前 Organization 权限生成的 Sidebar Key。 */
  visibleMenuKeys: OrganizationMenuKey[];
  /** 仅在当前 Organization 内判断权限。 */
  hasPermission: (permission: string) => boolean;
  /** 仅在当前 Organization 内判断应用可用性。 */
  canUseApp: (appCode: string) => boolean;
};

const hasGrantedPermission = (
  permissions: readonly string[],
  permission: string,
  scopedWildcard?: string,
) =>
  permissions.includes('*') ||
  (scopedWildcard ? permissions.includes(scopedWildcard) : false) ||
  permissions.includes(permission);

/** Platform Access 独立计算，禁止把多个 Organization 权限组合成 Platform 权限。 */
export const getPlatformAccess = (user: AuthCurrentUser): PlatformAccess => {
  const permissions = [...(user.platformPermissions ?? [])];
  const availableAppCodes = [...(user.projectAppCodes ?? [])];
  // 旧 isSuperAdmin 当前等价于 Project Admin；复用原管理菜单时拥有 Project 全部管理能力。
  const isProjectAdmin = user.isSuperAdmin;
  const hasPermission = (permission: string) =>
    isProjectAdmin ||
    hasGrantedPermission(permissions, permission, 'platform:*');
  const canUseApp = (appCode: string) => availableAppCodes.includes(appCode);
  const canEnterManagementCenter =
    isProjectAdmin ||
    permissions.some(
      (permission) =>
        permission === '*' ||
        permission === 'platform:*' ||
        permission.startsWith('platform:'),
    );
  const canManageOrganizations = [
    'platform:organization:create',
    'platform:organization:update',
    'platform:organization:delete',
  ].some(hasPermission);
  const canManagePlatformUsers = hasPermission('platform:user:manage');
  const canGrantPlatformPermissions = hasPermission(
    'platform:permission:grant',
  );
  const canViewPlatformAudit = hasPermission('platform:audit:view');
  const canViewStats = canEnterManagementCenter;
  // overview 是所有登录用户共享的固定首页，其余菜单仍由管理权限逐项加入。
  const visibleMenuKeys: PlatformMenuKey[] = ['overview'];

  if (canManageOrganizations) visibleMenuKeys.push('organizations');
  if (canManagePlatformUsers) visibleMenuKeys.push('users');
  if (canGrantPlatformPermissions) visibleMenuKeys.push('permissions');
  if (canViewPlatformAudit) visibleMenuKeys.push('logs');

  return {
    permissions,
    availableAppCodes,
    canEnterManagementCenter,
    canManageOrganizations,
    canManagePlatformUsers,
    canGrantPlatformPermissions,
    canViewPlatformAudit,
    canViewStats,
    visibleMenuKeys,
    hasPermission,
    canUseApp,
  };
};

/** 后端已经过滤可进入组织；前端仅按 organizationId 去重。 */
export const getAccessibleOrganizations = (user: AuthCurrentUser) => {
  const seenOrganizationIds = new Set<string>();
  return (user.organizations ?? []).filter((organization) => {
    if (
      !organization.organizationId ||
      seenOrganizationIds.has(organization.organizationId)
    ) {
      return false;
    }
    seenOrganizationIds.add(organization.organizationId);
    return true;
  });
};

/** URL 中的 organizationId 必须命中用户白名单，任意路径参数不会获得访问权。 */
export const getOrganizationAccess = (
  user: AuthCurrentUser,
  organizationId: string,
): ResolvedOrganizationAccess => {
  const organization = getAccessibleOrganizations(user).find(
    (candidate) => candidate.organizationId === organizationId,
  );
  const permissions = [...(organization?.permissions ?? [])];
  const availableAppCodes = [...(organization?.appCodes ?? [])];
  const hasPermission = (permission: string) =>
    Boolean(organization) &&
    hasGrantedPermission(permissions, permission, 'organization:*');
  const canUseApp = (appCode: string) =>
    Boolean(organization) && availableAppCodes.includes(appCode);
  const canManageMembers = hasPermission('organization:user:manage');
  const canManageRoles =
    hasPermission('organization:role:manage') ||
    hasPermission('organization:permission:grant');
  const canUpdateSettings = hasPermission('organization:settings:update');
  const canViewStats = canManageMembers || canManageRoles || canUpdateSettings;
  const visibleMenuKeys: OrganizationMenuKey[] = [];

  if (organization) visibleMenuKeys.push('home');
  if (canManageMembers) visibleMenuKeys.push('members');
  if (canManageRoles) visibleMenuKeys.push('roles');
  if (canUpdateSettings) visibleMenuKeys.push('settings');

  return {
    accessible: Boolean(organization),
    organization,
    permissions,
    availableAppCodes,
    canManageMembers,
    canManageRoles,
    canUpdateSettings,
    canViewStats,
    visibleMenuKeys,
    hasPermission,
    canUseApp,
  };
};
