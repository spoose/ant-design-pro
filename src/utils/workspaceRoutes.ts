import { generatePath, matchPath } from '@umijs/max';
import type { AuthCurrentUser } from '@/services/auth';
import { resolveLandingWorkspace } from './workspaceRules';
import type { WorkspaceScope } from './workspaceState';

/**
 * Workspace 正式 URL 模板。
 * 数据链路：config/routes.ts 注册路由 -> Umi Browser Router 产生 pathname
 * -> 本文件解析 Scope/App -> 标签、Sidebar、权限规则和请求 Header 共同消费。
 * URL 是当前 Scope、活动标签和 Sidebar 的唯一导航来源。
 */

const encodeRouteParam = (value: string) => encodeURIComponent(value);

export type PlatformPageKey =
  | 'overview'
  | 'organizations'
  | 'users'
  | 'permissions';

export type OrganizationPageKey = 'home' | 'members' | 'roles' | 'settings';

/** Platform 固定首页及其内部管理页的 URL 模板。 */
export const PLATFORM_PAGE_PATTERN = '/workspace/platform/:platformPageKey';
/** Platform App 标签及 App 内部子路由的 URL 模板。 */
export const PLATFORM_APP_PATTERN = '/workspace/platform/apps/:appKey/*';
const PLATFORM_APP_ROOT_PATTERN = '/workspace/platform/apps/:appKey';

/** 已认证但尚无任何可进入 Scope 时使用的中立落点。 */
export const ACCESS_PENDING_PATH = '/workspace/access-pending';

/** Organization 固定首页及其内部管理页的 URL 模板。 */
export const ORGANIZATION_PAGE_PATTERN =
  '/workspace/org/:organizationId/:pageKey';
/** 用于从任意 Organization Workspace URL 提取 organizationId。 */
export const ORGANIZATION_WORKSPACE_PATTERN =
  '/workspace/org/:organizationId/*';
/** Organization App 标签及 App 内部子路由的 URL 模板。 */
export const ORGANIZATION_APP_PATTERN =
  '/workspace/org/:organizationId/apps/:appKey/*';
const ORGANIZATION_APP_ROOT_PATTERN =
  '/workspace/org/:organizationId/apps/:appKey';

/** 根据稳定页面 Key 生成 Platform URL，供菜单和首页标签共同使用。 */
export const getPlatformPagePath = (platformPageKey: PlatformPageKey) =>
  generatePath(PLATFORM_PAGE_PATTERN, { platformPageKey });

export const getPlatformHomePath = () => getPlatformPagePath('overview');

export const getPlatformAppWorkspacePath = (appKey: string) =>
  generatePath(PLATFORM_APP_ROOT_PATTERN, {
    appKey: encodeRouteParam(appKey),
  });

/**
 * 生成 Platform Skill 内部页面 URL。
 * appKey 来自后端授权，pageKey 来自 skillRegistry.navigation.pathSegment。
 */
export const getPlatformAppPagePath = (appKey: string, pageKey: string) =>
  `${getPlatformAppWorkspacePath(appKey)}/${encodeRouteParam(pageKey)}`;

/** 根据后端 organizationId 与稳定页面 Key 生成 Organization URL。 */
export const getOrganizationPagePath = (
  organizationId: string,
  pageKey: OrganizationPageKey,
) =>
  generatePath(ORGANIZATION_PAGE_PATTERN, {
    organizationId: encodeRouteParam(organizationId),
    pageKey,
  });

export const getOrganizationHomePath = (organizationId: string) =>
  getOrganizationPagePath(organizationId, 'home');

export const getOrganizationAppWorkspacePath = (
  organizationId: string,
  appKey: string,
) =>
  generatePath(ORGANIZATION_APP_ROOT_PATTERN, {
    organizationId: encodeRouteParam(organizationId),
    appKey: encodeRouteParam(appKey),
  });

/**
 * 生成 Organization Skill 内部页面 URL；organizationId 保证不同组织不能共享标签快照。
 */
export const getOrganizationAppPagePath = (
  organizationId: string,
  appKey: string,
  pageKey: string,
) =>
  `${getOrganizationAppWorkspacePath(organizationId, appKey)}/${encodeRouteParam(
    pageKey,
  )}`;

/**
 * 登录落点的单一公开门面。
 * 页面只提供 POST /api/currentUser/get 的结果；内部完成权限落点计算和 URL 生成。
 * 登录提交、应用根路由和旧 /home 兼容入口必须共用该函数。
 */
export const resolveLandingPath = (user: AuthCurrentUser) => {
  // 单一落点链路：currentUser 授权快照 -> LandingWorkspace -> 正式页面 URL。
  const landing = resolveLandingWorkspace(user);
  switch (landing.kind) {
    case 'platform':
      return getPlatformHomePath();
    case 'organization':
      return getOrganizationHomePath(landing.organizationId);
    case 'access-pending':
      return ACCESS_PENDING_PATH;
  }
};

/** 从 Organization URL 读取组织 ID；Platform 与非 Workspace URL 返回 undefined。 */
export const getWorkspaceOrganizationId = (pathname: string) =>
  matchPath(ORGANIZATION_WORKSPACE_PATTERN, pathname)?.params.organizationId;

/** 从 Platform 或 Organization App URL 读取 App Key。 */
export const getWorkspaceAppKey = (pathname: string) =>
  matchPath(PLATFORM_APP_PATTERN, pathname)?.params.appKey ??
  matchPath(ORGANIZATION_APP_PATTERN, pathname)?.params.appKey;

/** 从 Platform 固定页面 URL 读取页面 Key；App URL 返回 undefined。 */
export const getWorkspacePlatformPageKey = (pathname: string) =>
  matchPath(PLATFORM_PAGE_PATTERN, pathname)?.params.platformPageKey;

/** 从 Organization 固定首页 URL 读取页面 Key；App URL 返回 undefined。 */
export const getWorkspaceOrganizationPageKey = (pathname: string) =>
  matchPath(ORGANIZATION_PAGE_PATTERN, pathname)?.params.pageKey;

/**
 * 从 App 通配路由读取 Skill 内部页面 Key；App 根路径返回 undefined。
 * 该值只选择当前 App 标签内的页面，不参与标签 ID 生成。
 */
export const getWorkspaceAppPageKey = (pathname: string) => {
  // Umi/React Router 的 Params 类型不会从字符串常量推断 `*`，运行时仍以该键返回通配路径。
  const platformParams = matchPath(PLATFORM_APP_PATTERN, pathname)?.params as
    | Record<string, string | undefined>
    | undefined;
  const organizationParams = matchPath(ORGANIZATION_APP_PATTERN, pathname)
    ?.params as Record<string, string | undefined> | undefined;
  const wildcardPath = platformParams?.['*'] ?? organizationParams?.['*'];
  const pageKey = wildcardPath?.split('/').find(Boolean);
  return pageKey || undefined;
};

/** Platform 页面与 Platform App 都属于同一个 Platform Scope。 */
export const isPlatformWorkspacePath = (pathname: string) =>
  Boolean(
    matchPath(PLATFORM_PAGE_PATTERN, pathname) ||
      matchPath(PLATFORM_APP_PATTERN, pathname),
  );

/** Sidebar、标签和请求层共用的 Scope 解析器，不维护第二份活动组织 State。 */
export const resolveWorkspaceScopeFromPath = (
  pathname: string,
): WorkspaceScope | undefined => {
  if (isPlatformWorkspacePath(pathname)) return { kind: 'platform' };

  const organizationId = getWorkspaceOrganizationId(pathname);
  return organizationId ? { kind: 'organization', organizationId } : undefined;
};
