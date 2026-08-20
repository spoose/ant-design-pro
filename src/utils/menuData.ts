import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  DesktopOutlined,
  FileTextOutlined,
  HomeOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { MenuDataItem } from '@ant-design/pro-components';
import { createElement } from 'react';
import { getSkillDefinition } from '@/config/skillRegistry';
import type { AuthCurrentUser } from '@/services/auth';
import {
  getOrganizationAppPagePath,
  getOrganizationAppWorkspacePath,
  getOrganizationPagePath,
  getOrganizationStatsPagePath,
  getOrganizationStatsRootPath,
  getPlatformAppPagePath,
  getPlatformAppWorkspacePath,
  getPlatformPagePath,
  getPlatformStatsPagePath,
  getPlatformStatsRootPath,
  getWorkspaceAppKey,
  getWorkspaceOrganizationId,
  isPlatformWorkspacePath,
  type StatsPageKey,
} from './workspaceRoutes';
import {
  getOrganizationAccess,
  getPlatformAccess,
  type OrganizationMenuKey,
  type PlatformMenuKey,
} from './workspaceRules';
import { getOrganizationBadge } from './workspaceState';

const exampleRootPaths = new Set([
  '/welcome',
  '/list',
  '/profile',
  '/result',
  '/exception',
  '/account',
]);
const exampleFormPaths = new Set(['/form/step-form', '/form/advanced-form']);

/** 仅重组 ProLayout 模板菜单，不修改 Umi 路由。 */
export const groupTemplateExampleMenus = (menuData: MenuDataItem[]) => {
  const exampleItems: MenuDataItem[] = [];
  const primaryItems = menuData.flatMap((item) => {
    if (item.path && exampleRootPaths.has(item.path)) {
      exampleItems.push(item);
      return [];
    }
    if (item.path === '/form' && item.children) {
      const primaryChildren = item.children.filter((child) => {
        if (child.path && exampleFormPaths.has(child.path)) {
          exampleItems.push(child);
          return false;
        }
        return true;
      });
      return [{ ...item, children: primaryChildren }];
    }
    return [item];
  });
  return primaryItems.map((item) =>
    item.path === '/examples' ? { ...item, children: exampleItems } : item,
  );
};

const organizationMenuDefinitions: Record<
  OrganizationMenuKey,
  { name: string; icon: typeof HomeOutlined }
> = {
  home: { name: '组织首页', icon: HomeOutlined },
  members: { name: '成员管理', icon: TeamOutlined },
  roles: { name: '角色管理', icon: SafetyCertificateOutlined },
  settings: { name: '组织设置', icon: SettingOutlined },
};

/**
 * 并入首页侧栏、不再切换独立 App 侧栏的 Skill。
 * 其它 Skill 仍走 createAppWorkspaceMenus。
 */
const HOME_SIDEBAR_SKILL_CODE = 'ai-assistant';

const isHomeSidebarSkill = (appKey: string | undefined) =>
  appKey === HOME_SIDEBAR_SKILL_CODE;

/** 组织首页侧栏顺序；无授权的槽位直接跳过，不再二次插入。 */
const ORGANIZATION_HOME_SIDEBAR_ORDER = [
  'home',
  'ai-assistant',
  'stats',
  'members',
  'roles',
  'settings',
] as const;

/** 平台首页侧栏顺序；organizations / users / permissions 一级隐藏，users 挂在系统管理下。 */
const PLATFORM_HOME_SIDEBAR_ORDER = [
  'overview',
  'ai-assistant',
  'stats',
  'organizations',
  'users',
  'system',
  'permissions',
] as const;

/** 只从侧栏隐藏，路由和授权仍保留；去掉集合即可恢复菜单。 */
const HIDDEN_PLATFORM_HOME_MENU_KEYS = new Set<PlatformMenuKey>([
  'organizations',
  'users',
  'permissions',
]);

/** 把 pAI 做成首页侧栏二级菜单；子路径仍使用现有 App URL。 */
const createHomeSidebarSkillMenu = (
  organizationId: string | undefined,
  skillCode: string,
): MenuDataItem | undefined => {
  const definition = getSkillDefinition(skillCode);
  if (!definition) return undefined;

  const getPagePath = (pageKey: string) =>
    organizationId
      ? getOrganizationAppPagePath(organizationId, skillCode, pageKey)
      : getPlatformAppPagePath(skillCode, pageKey);
  // 与 /list → /list/table-list 相同：父级 path/key 用 App 根路径，子项用更长的独立 path。
  // 点父级会落到无 pageKey 的 App 根 URL，由 workspaceAccess 重定向到 overview。
  const appWorkspacePath = organizationId
    ? getOrganizationAppWorkspacePath(organizationId, skillCode)
    : getPlatformAppWorkspacePath(skillCode);

  return {
    path: appWorkspacePath,
    key: appWorkspacePath,
    name: definition.title,
    // 侧栏父级图标来自 skillRegistry.icon（与首页卡片共用）；子项用 navigation[].icon。
    icon: createElement(definition.icon),
    locale: false,
    children: definition.navigation.map((item) => ({
      path: getPagePath(item.pathSegment),
      name: item.title,
      icon: createElement(item.icon),
      locale: false,
    })),
  };
};

const statsPageDefinitions: Record<
  StatsPageKey,
  { name: string; icon: typeof HomeOutlined }
> = {
  users: { name: '用户规模', icon: TeamOutlined },
  requests: { name: '请求用量', icon: ThunderboltOutlined },
  traces: { name: '操作痕迹', icon: AuditOutlined },
};

/** 与 /dashboard 相同：父级 path 是 /stats 前缀，子项使用更长的独立 path。 */
const createStatsHomeMenu = (
  organizationId: string | undefined,
): MenuDataItem => {
  const rootPath = organizationId
    ? getOrganizationStatsRootPath(organizationId)
    : getPlatformStatsRootPath();
  const getPagePath = (statsPageKey: StatsPageKey) =>
    organizationId
      ? getOrganizationStatsPagePath(organizationId, statsPageKey)
      : getPlatformStatsPagePath(statsPageKey);

  return {
    path: rootPath,
    key: rootPath,
    name: '统计',
    icon: createElement(BarChartOutlined),
    locale: false,
    children: (['users', 'requests', 'traces'] as const).map((statsPageKey) => {
      const definition = statsPageDefinitions[statsPageKey];
      const path = getPagePath(statsPageKey);
      return {
        path,
        key: path,
        name: definition.name,
        icon: createElement(definition.icon),
        locale: false,
      };
    }),
  };
};

/** 系统管理：日志 / 用户管理，一级 users 仍在顺序表里但隐藏。 */
const createSystemAdminMenu = (
  visibleKeys: Set<PlatformMenuKey>,
): MenuDataItem[] => {
  const children: MenuDataItem[] = [];
  if (visibleKeys.has('logs')) {
    children.push({
      path: getPlatformPagePath('logs'),
      key: getPlatformPagePath('logs'),
      name: '日志',
      icon: createElement(FileTextOutlined),
      locale: false,
    });
  }
  if (visibleKeys.has('users')) {
    children.push({
      path: getPlatformPagePath('users'),
      key: getPlatformPagePath('users'),
      name: '用户管理',
      icon: createElement(TeamOutlined),
      locale: false,
    });
  }
  if (!children.length) return [];

  const path = getPlatformPagePath('system');
  return [
    {
      path,
      key: path,
      name: '系统管理',
      icon: createElement(SettingOutlined),
      locale: false,
      children,
    },
  ];
};

const createFixedHomeMenuItem = (
  definition: { name: string; icon: typeof HomeOutlined },
  path: string,
): MenuDataItem => ({
  path,
  name: definition.name,
  icon: createElement(definition.icon),
  locale: false,
});

/** 组织首页固定标签内部菜单；xOneAI 子项会打开 App 标签，其余项只更新 Home 标签 URL。 */
export const createOrganizationWorkspaceMenus = (
  organizationId: string,
  visibleMenuKeys: OrganizationMenuKey[],
  availableSkillCodes: readonly string[] = [],
  canViewStats = false,
): MenuDataItem[] => {
  const visibleKeys = new Set(visibleMenuKeys);
  const hasAiAssistant = availableSkillCodes.includes(HOME_SIDEBAR_SKILL_CODE);

  return ORGANIZATION_HOME_SIDEBAR_ORDER.flatMap((slot) => {
    if (slot === 'ai-assistant') {
      if (!hasAiAssistant) return [];
      const skillMenu = createHomeSidebarSkillMenu(
        organizationId,
        HOME_SIDEBAR_SKILL_CODE,
      );
      return skillMenu ? [skillMenu] : [];
    }
    if (slot === 'stats') {
      return canViewStats ? [createStatsHomeMenu(organizationId)] : [];
    }
    if (!visibleKeys.has(slot)) return [];
    return [
      createFixedHomeMenuItem(
        organizationMenuDefinitions[slot],
        getOrganizationPagePath(organizationId, slot),
      ),
    ];
  });
};

const platformMenuDefinitions: Record<
  Exclude<PlatformMenuKey, 'logs'>,
  { name: string; icon: typeof HomeOutlined }
> = {
  // 工作台用 DesktopOutlined，与 Ant Design Pro 工作台入口同一套图标。
  overview: { name: '工作台', icon: DesktopOutlined },
  organizations: { name: '组织管理', icon: AppstoreOutlined },
  users: { name: '用户管理', icon: TeamOutlined },
  permissions: { name: '权限管理', icon: SafetyCertificateOutlined },
};

/** Platform 固定首页菜单；顺序见 PLATFORM_HOME_SIDEBAR_ORDER。 */
export const createPlatformWorkspaceMenus = (
  visibleMenuKeys: PlatformMenuKey[],
  availableSkillCodes: readonly string[] = [],
  canViewStats = false,
): MenuDataItem[] => {
  const visibleKeys = new Set(visibleMenuKeys);
  const hasAiAssistant = availableSkillCodes.includes(HOME_SIDEBAR_SKILL_CODE);

  return PLATFORM_HOME_SIDEBAR_ORDER.flatMap((slot) => {
    if (slot === 'ai-assistant') {
      if (!hasAiAssistant) return [];
      const skillMenu = createHomeSidebarSkillMenu(
        undefined,
        HOME_SIDEBAR_SKILL_CODE,
      );
      return skillMenu ? [skillMenu] : [];
    }
    if (slot === 'stats') {
      return canViewStats ? [createStatsHomeMenu(undefined)] : [];
    }
    if (slot === 'system') {
      return createSystemAdminMenu(visibleKeys);
    }
    if (HIDDEN_PLATFORM_HOME_MENU_KEYS.has(slot)) {
      return [];
    }
    if (!visibleKeys.has(slot)) return [];
    return [
      createFixedHomeMenuItem(
        platformMenuDefinitions[slot],
        getPlatformPagePath(slot),
      ),
    ];
  });
};

/**
 * App 标签拥有自己的 Sidebar。
 * pathname 只用于确定 Platform/Organization Scope；菜单内容统一来自 Skill Registry。
 */
export const createAppWorkspaceMenus = (
  pathname: string,
  appKey: string,
): MenuDataItem[] => {
  const definition = getSkillDefinition(appKey);
  // 未注册 Skill 仍保留当前入口，避免后端先发新 skillCode 时出现空 Sidebar。
  if (!definition) {
    return [
      {
        path: pathname,
        name: appKey,
        icon: createElement(AppstoreOutlined),
        locale: false,
      },
    ];
  }

  const organizationId = getWorkspaceOrganizationId(pathname);

  return definition.navigation.map((item) => ({
    // overview、queue/history 等都是并列子路径，确保 ProLayout 只高亮一个菜单项。
    path: organizationId
      ? getOrganizationAppPagePath(organizationId, appKey, item.pathSegment)
      : getPlatformAppPagePath(appKey, item.pathSegment),
    name: item.title,
    icon: createElement(item.icon),
    locale: false,
  }));
};

export type WorkspaceMenuDescriptor = {
  kind: 'platform' | 'organization' | 'app';
  /** Sidebar 始终显示的短标记；Organization App 沿用组织编码以保留 Scope 识别。 */
  badge: string;
  /** Sidebar 身份栏唯一可见名称：管理中心、Organization 名或 Skill 名。 */
  title: string;
  items: MenuDataItem[];
};

/**
 * URL 派生 Sidebar：Platform/Home/App 和 Organization/Home/App 都不保存额外侧栏 State。
 */
export const resolveWorkspaceMenuDescriptor = (
  user: AuthCurrentUser | undefined,
  pathname: string,
): WorkspaceMenuDescriptor | undefined => {
  if (!user) return undefined;

  const appKey = getWorkspaceAppKey(pathname);
  if (isPlatformWorkspacePath(pathname)) {
    const access = getPlatformAccess(user);
    if (!access.canEnterManagementCenter) return undefined;
    if (appKey && !access.canUseSkill(appKey)) return undefined;
    if (appKey && !isHomeSidebarSkill(appKey)) {
      return {
        kind: 'app',
        badge: 'AP',
        title: getSkillDefinition(appKey)?.title ?? appKey,
        items: createAppWorkspaceMenus(pathname, appKey),
      };
    }
    return {
      kind: 'platform',
      badge: 'MC',
      title: '管理中心',
      items: createPlatformWorkspaceMenus(
        access.visibleMenuKeys,
        access.availableSkillCodes,
        access.canViewStats,
      ),
    };
  }

  const organizationId = getWorkspaceOrganizationId(pathname);
  if (!organizationId) return undefined;
  const access = getOrganizationAccess(user, organizationId);
  const organization = access.organization;
  if (!organization) return undefined;

  if (appKey && !access.canUseSkill(appKey)) return undefined;
  if (appKey && !isHomeSidebarSkill(appKey)) {
    return {
      kind: 'app',
      // Badge 保留 Organization Scope 识别；文字只显示 App 名，不再重复组织名称。
      badge: getOrganizationBadge(organization.organizationCode),
      title: getSkillDefinition(appKey)?.title ?? appKey,
      items: createAppWorkspaceMenus(pathname, appKey),
    };
  }

  return {
    kind: 'organization',
    badge: getOrganizationBadge(organization.organizationCode),
    title: organization.organizationName,
    items: createOrganizationWorkspaceMenus(
      organization.organizationId,
      access.visibleMenuKeys,
      access.availableSkillCodes,
      access.canViewStats,
    ),
  };
};

/**
 * 面包屑第一段与侧栏身份对齐：Platform 为「管理中心」，Organization 为组织名。
 * trail 使用侧栏菜单名，例如 ['工作台']、['统计', '用户规模']、['文件审查', '审查工作台']。
 */
export const buildWorkspaceBreadcrumb = (
  user: AuthCurrentUser | undefined,
  pathname: string,
  trail: readonly string[],
): string[] => {
  const root = isPlatformWorkspacePath(pathname)
    ? '管理中心'
    : (user?.organizations.find(
        (item) => item.organizationId === getWorkspaceOrganizationId(pathname),
      )?.organizationName ?? '当前组织');
  return [root, ...trail];
};
