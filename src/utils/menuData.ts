import {
  AppstoreOutlined,
  DashboardOutlined,
  HomeOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { MenuDataItem } from '@ant-design/pro-components';
import { createElement } from 'react';
import { getSkillDefinition } from '@/config/skillRegistry';
import type { AuthCurrentUser } from '@/services/auth';
import {
  getOrganizationAppPagePath,
  getOrganizationPagePath,
  getPlatformAppPagePath,
  getPlatformPagePath,
  getWorkspaceAppKey,
  getWorkspaceOrganizationId,
  isPlatformWorkspacePath,
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

/** 组织首页固定标签内部菜单；点击只更新当前 Home 标签 URL。 */
export const createOrganizationWorkspaceMenus = (
  organizationId: string,
  visibleMenuKeys: OrganizationMenuKey[],
): MenuDataItem[] =>
  visibleMenuKeys.map((key) => {
    const definition = organizationMenuDefinitions[key];
    return {
      path: getOrganizationPagePath(organizationId, key),
      name: definition.name,
      icon: createElement(definition.icon),
      locale: false,
    };
  });

const platformMenuDefinitions: Record<
  Exclude<PlatformMenuKey, 'audit'>,
  { name: string; icon: typeof HomeOutlined }
> = {
  overview: { name: '管理总览', icon: DashboardOutlined },
  organizations: { name: '组织管理', icon: AppstoreOutlined },
  users: { name: '人员管理', icon: TeamOutlined },
  permissions: { name: '权限管理', icon: SafetyCertificateOutlined },
};

/** Platform 固定首页菜单；审计页面尚未实现，因此本阶段不生成审计菜单项。 */
export const createPlatformWorkspaceMenus = (
  visibleMenuKeys: PlatformMenuKey[],
): MenuDataItem[] =>
  visibleMenuKeys.flatMap((key) => {
    if (key === 'audit') return [];
    const definition = platformMenuDefinitions[key];
    return [
      {
        path: getPlatformPagePath(key),
        name: definition.name,
        icon: createElement(definition.icon),
        locale: false,
      },
    ];
  });

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
    if (appKey) {
      if (!access.canUseSkill(appKey)) return undefined;
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
      items: createPlatformWorkspaceMenus(access.visibleMenuKeys),
    };
  }

  const organizationId = getWorkspaceOrganizationId(pathname);
  if (!organizationId) return undefined;
  const access = getOrganizationAccess(user, organizationId);
  const organization = access.organization;
  if (!organization) return undefined;

  if (appKey) {
    if (!access.canUseSkill(appKey)) return undefined;
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
    ),
  };
};
