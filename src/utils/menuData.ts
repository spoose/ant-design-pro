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
import { getAppDefinition } from '@/config/appRegistry';
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
  // members/roles 已并入“组织设置”分组；定义保留以维持 Record 类型和菜单恢复能力。
  members: { name: '成员管理', icon: TeamOutlined },
  roles: { name: '角色管理', icon: SafetyCertificateOutlined },
  settings: { name: '组织设置', icon: SettingOutlined },
};

/**
 * 并入首页侧栏、不再切换独立 App 侧栏的 App。
 * 其它 App 仍走 createAppWorkspaceMenus。
 */
const HOME_SIDEBAR_SKILL_CODE = 'ai-assistant';

const isHomeSidebarApp = (appKey: string | undefined) =>
  appKey === HOME_SIDEBAR_SKILL_CODE;

/** 组织首页侧栏顺序；members/roles 并入“组织设置”分组（角色管理隐藏，路由保留）。 */
const ORGANIZATION_HOME_SIDEBAR_ORDER = [
  'home',
  'ai-assistant',
  'stats',
  'settings',
] as const;

/** Project 管理侧栏顺序；organizations 已并入“系统设置”分组，users/permissions 一级隐藏。 */
const PLATFORM_HOME_SIDEBAR_ORDER = [
  'overview',
  'ai-assistant',
  'stats',
  'users',
  'system',
  'permissions',
] as const;

/** 只从侧栏隐藏，路由和授权仍保留；去掉集合即可恢复菜单。 */
const HIDDEN_PLATFORM_HOME_MENU_KEYS = new Set<PlatformMenuKey>([
  'users',
  'permissions',
]);

/** 把 pAI 做成首页侧栏二级菜单；子路径仍使用现有 App URL。 */
const createHomeSidebarAppMenu = (
  organizationId: string | undefined,
  appCode: string,
): MenuDataItem | undefined => {
  const definition = getAppDefinition(appCode);
  if (!definition) return undefined;

  const getPagePath = (pageKey: string) =>
    organizationId
      ? getOrganizationAppPagePath(organizationId, appCode, pageKey)
      : getPlatformAppPagePath(appCode, pageKey);
  // 与 /list → /list/table-list 相同：父级 path/key 用 App 根路径，子项用更长的独立 path。
  // 点父级会落到无 pageKey 的 App 根 URL，由 workspaceAccess 重定向到 overview。
  const appWorkspacePath = organizationId
    ? getOrganizationAppWorkspacePath(organizationId, appCode)
    : getPlatformAppWorkspacePath(appCode);

  return {
    path: appWorkspacePath,
    key: appWorkspacePath,
    name: definition.title,
    // 侧栏父级图标来自 appRegistry.icon（与首页卡片共用）；子项用 navigation[].icon。
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

/** 系统设置：组织管理 / 用户管理 / 日志；一级 users/permissions 仍在顺序表里但隐藏。 */
const createSystemAdminMenu = (
  visibleKeys: Set<PlatformMenuKey>,
): MenuDataItem[] => {
  const children: MenuDataItem[] = [];
  if (visibleKeys.has('organizations')) {
    children.push({
      path: getPlatformPagePath('organizations'),
      key: getPlatformPagePath('organizations'),
      name: '组织管理',
      icon: createElement(AppstoreOutlined),
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
  if (visibleKeys.has('logs')) {
    children.push({
      path: getPlatformPagePath('logs'),
      key: getPlatformPagePath('logs'),
      name: '日志',
      icon: createElement(FileTextOutlined),
      locale: false,
    });
  }
  if (!children.length) return [];

  const path = getPlatformPagePath('system');
  return [
    {
      path,
      key: path,
      name: '系统设置',
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
  availableAppCodes: readonly string[] = [],
  canViewStats = false,
): MenuDataItem[] => {
  const visibleKeys = new Set(visibleMenuKeys);
  const hasAiAssistant = availableAppCodes.includes(HOME_SIDEBAR_SKILL_CODE);

  return ORGANIZATION_HOME_SIDEBAR_ORDER.flatMap((slot) => {
    if (slot === 'ai-assistant') {
      if (!hasAiAssistant) return [];
      const appMenu = createHomeSidebarAppMenu(
        organizationId,
        HOME_SIDEBAR_SKILL_CODE,
      );
      return appMenu ? [appMenu] : [];
    }
    if (slot === 'stats') {
      return canViewStats ? [createStatsHomeMenu(organizationId)] : [];
    }
    if (slot === 'settings') {
      // 组织设置升级为父级分组：原成员管理以“用户管理”子菜单并入，角色管理隐藏但路由保留。
      const children: MenuDataItem[] = [];
      if (visibleKeys.has('members')) {
        children.push(
          createFixedHomeMenuItem(
            { name: '用户管理', icon: TeamOutlined },
            getOrganizationPagePath(organizationId, 'members'),
          ),
        );
      }
      if (!visibleKeys.has(slot) && !children.length) return [];
      const settingsMenu: MenuDataItem = {
        path: getOrganizationPagePath(organizationId, 'settings'),
        key: getOrganizationPagePath(organizationId, 'settings'),
        name: organizationMenuDefinitions.settings.name,
        icon: createElement(organizationMenuDefinitions.settings.icon),
        locale: false,
      };
      if (children.length) settingsMenu.children = children;
      return [settingsMenu];
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
  availableAppCodes: readonly string[] = [],
  canViewStats = false,
): MenuDataItem[] => {
  const visibleKeys = new Set(visibleMenuKeys);
  const hasAiAssistant = availableAppCodes.includes(HOME_SIDEBAR_SKILL_CODE);

  return PLATFORM_HOME_SIDEBAR_ORDER.flatMap((slot) => {
    if (slot === 'ai-assistant') {
      if (!hasAiAssistant) return [];
      const appMenu = createHomeSidebarAppMenu(
        undefined,
        HOME_SIDEBAR_SKILL_CODE,
      );
      return appMenu ? [appMenu] : [];
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
 * pathname 只用于确定 Platform/Organization Scope；菜单内容统一来自 App Registry。
 */
export const createAppWorkspaceMenus = (
  pathname: string,
  appKey: string,
): MenuDataItem[] => {
  const definition = getAppDefinition(appKey);
  // 未注册 App 仍保留当前入口，避免后端先发新 appCode 时出现空 Sidebar。
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
  /** Sidebar 身份栏唯一可见名称：平台工作台、Organization 名或 App 名。 */
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
    if (appKey && !access.canUseApp(appKey)) return undefined;
    if (appKey && !isHomeSidebarApp(appKey)) {
      return {
        kind: 'app',
        badge: 'AP',
        title: getAppDefinition(appKey)?.title ?? appKey,
        items: createAppWorkspaceMenus(pathname, appKey),
      };
    }
    return {
      kind: 'platform',
      badge: user.isSuperAdmin ? 'PM' : 'PJ',
      title: user.isSuperAdmin ? '项目控制台' : '工作台',
      items: createPlatformWorkspaceMenus(
        access.visibleMenuKeys,
        access.availableAppCodes,
        access.canViewStats,
      ),
    };
  }

  const organizationId = getWorkspaceOrganizationId(pathname);
  if (!organizationId) return undefined;
  const access = getOrganizationAccess(user, organizationId);
  const organization = access.organization;
  if (!organization) return undefined;

  if (appKey && !access.canUseApp(appKey)) return undefined;
  if (appKey && !isHomeSidebarApp(appKey)) {
    return {
      kind: 'app',
      // Badge 保留 Organization Scope 识别；文字只显示 App 名，不再重复组织名称。
      badge: getOrganizationBadge(organization.organizationCode),
      title: getAppDefinition(appKey)?.title ?? appKey,
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
      access.availableAppCodes,
      access.canViewStats,
    ),
  };
};

/**
 * 面包屑第一段与侧栏身份对齐：Project Admin 为「项目控制台」，Organization 为组织名。
 * trail 使用侧栏菜单名，例如 ['工作台']、['统计', '用户规模']、['文件审查', '审查工作台']。
 */
export const buildWorkspaceBreadcrumb = (
  user: AuthCurrentUser | undefined,
  pathname: string,
  trail: readonly string[],
): string[] => {
  const root = isPlatformWorkspacePath(pathname)
    ? user?.isSuperAdmin
      ? '项目控制台'
      : '工作台'
    : (user?.organizations.find(
        (item) => item.organizationId === getWorkspaceOrganizationId(pathname),
      )?.organizationName ?? '当前组织');
  return [root, ...trail];
};
