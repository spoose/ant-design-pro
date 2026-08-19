import type { AuthCurrentUser, OrganizationAccess } from '@/services/auth';

/** Platform 固定首页侧栏的稳定菜单标识。 */
export type PlatformMenuKey =
  /** 管理中心首页。 */
  | 'overview'
  /** 全部 Organization 的平台级管理页。 */
  | 'organizations'
  /** 跨 Organization 的平台人员管理页。 */
  | 'users'
  /** Platform 权限配置页。 */
  | 'permissions'
  /** Platform 审计页；页面尚未实现，当前菜单生成器会忽略它。 */
  | 'audit';

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

/** 由 currentUser.platformPermissions 派生的 Platform 授权画像。 */
export type PlatformAccess = {
  /** POST /api/currentUser/get 返回的 platformPermissions 防御性副本。 */
  permissions: string[];
  /** POST /api/currentUser/get 返回的 platformSkillCodes 防御性副本。 */
  availableSkillCodes: string[];
  /** 是否至少拥有一个 Platform 权限，决定能否进入管理中心。 */
  canEnterManagementCenter: boolean;
  /** 是否显示并允许进入组织管理。 */
  canManageOrganizations: boolean;
  /** 是否显示并允许进入平台人员管理。 */
  canManagePlatformUsers: boolean;
  /** 是否显示并允许进入平台权限管理。 */
  canGrantPlatformPermissions: boolean;
  /** 是否具备平台审计查看能力。 */
  canViewPlatformAudit: boolean;
  /** 是否可查看平台统计；与进入管理中心同一道门。 */
  canViewStats: boolean;
  /** 由上述布尔能力按固定顺序生成的 Platform Sidebar Key。 */
  visibleMenuKeys: PlatformMenuKey[];
  /** 供页面按钮和操作入口复用的 Platform 权限判断函数。 */
  hasPermission: (permission: string) => boolean;
  /** 判断 Platform Scope 内是否可打开指定 App/Skill 标签。 */
  canUseSkill: (skillCode: string) => boolean;
};

/** 指定 Organization 的前端授权画像；不会读取其他 Organization 或 Platform 权限。 */
export type ResolvedOrganizationAccess = {
  /** URL organizationId 是否命中 currentUser.organizations 白名单。 */
  accessible: boolean;
  /** 命中时返回原始 Organization 授权记录。 */
  organization?: OrganizationAccess;
  /** 当前 Organization permissions 的防御性副本。 */
  permissions: string[];
  /** 当前 Organization skillCodes 的防御性副本。 */
  availableSkillCodes: string[];
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
  /** 仅在当前 Organization 内判断 App/Skill 可用性。 */
  canUseSkill: (skillCode: string) => boolean;
};

/** 登录完成后声明式描述第一个页面；执行跳转由调用方负责。 */
export type LandingWorkspace =
  | { kind: 'platform' }
  | { kind: 'organization'; organizationId: string }
  | { kind: 'access-pending' };

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
  const availableSkillCodes = [...(user.platformSkillCodes ?? [])];
  const hasPermission = (permission: string) =>
    hasGrantedPermission(permissions, permission, 'platform:*');
  const canUseSkill = (skillCode: string) =>
    availableSkillCodes.includes(skillCode);
  const canEnterManagementCenter = permissions.some(
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
  const visibleMenuKeys: PlatformMenuKey[] = [];

  if (canEnterManagementCenter) visibleMenuKeys.push('overview');
  if (canManageOrganizations) visibleMenuKeys.push('organizations');
  if (canManagePlatformUsers) visibleMenuKeys.push('users');
  if (canGrantPlatformPermissions) visibleMenuKeys.push('permissions');
  if (canViewPlatformAudit) visibleMenuKeys.push('audit');

  return {
    permissions,
    availableSkillCodes,
    canEnterManagementCenter,
    canManageOrganizations,
    canManagePlatformUsers,
    canGrantPlatformPermissions,
    canViewPlatformAudit,
    canViewStats,
    visibleMenuKeys,
    hasPermission,
    canUseSkill,
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
  const availableSkillCodes = [...(organization?.skillCodes ?? [])];
  const hasPermission = (permission: string) =>
    Boolean(organization) &&
    hasGrantedPermission(permissions, permission, 'organization:*');
  const canUseSkill = (skillCode: string) =>
    Boolean(organization) && availableSkillCodes.includes(skillCode);
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
    availableSkillCodes,
    canManageMembers,
    canManageRoles,
    canUpdateSettings,
    canViewStats,
    visibleMenuKeys,
    hasPermission,
    canUseSkill,
  };
};

/**
 * 登录落点优先级：Platform -> 有效默认组织 -> 第一个可访问组织 -> 等待授权。
 * organizations 已由后端按 code、id 稳定排序；这里不写回 defaultOrganizationId，
 * 仅把第一个组织作为当前登录的有效默认入口。
 * 标签快照不参与授权和 Scope 选择，只在进入目标 Scope 后恢复 App 标签。
 */
export const resolveLandingWorkspace = (
  user: AuthCurrentUser,
): LandingWorkspace => {
  if (getPlatformAccess(user).canEnterManagementCenter) {
    return { kind: 'platform' };
  }

  const organizations = getAccessibleOrganizations(user);
  const defaultOrganization = organizations.find(
    (organization) =>
      organization.organizationId === user.defaultOrganizationId,
  );
  if (defaultOrganization) {
    return {
      kind: 'organization',
      organizationId: defaultOrganization.organizationId,
    };
  }
  const firstAccessibleOrganization = organizations[0];
  if (firstAccessibleOrganization) {
    return {
      kind: 'organization',
      organizationId: firstAccessibleOrganization.organizationId,
    };
  }
  return { kind: 'access-pending' };
};
