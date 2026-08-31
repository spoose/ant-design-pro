import { getAppDefinition } from '@/config/appRegistry';
import {
  getWorkspaceAppKey,
  getWorkspaceOrganizationPageKey,
  getWorkspacePlatformPageKey,
  getWorkspaceStatsPageKey,
} from '@/utils/workspaceRoutes';

/** 工作台快速入口最多保留的最近打开条数。 */
export const WORKSPACE_RECENT_LIMIT = 8;

export type WorkspaceRecent = {
  title: string;
  url: string;
};

const PLATFORM_PAGE_TITLES: Record<string, string> = {
  organizations: '组织管理',
  users: '用户管理',
  permissions: '权限管理',
  logs: '日志',
};

const ORGANIZATION_PAGE_TITLES: Record<string, string> = {
  members: '成员',
  roles: '角色',
  settings: '设置',
};

const STATS_PAGE_TITLES: Record<string, string> = {
  users: '用户规模',
  requests: '请求用量',
  traces: '操作痕迹',
};

const pathOf = (url: string) => url.split(/[?#]/)[0] ?? url;

const recentKey = (url: string) => {
  const pathname = pathOf(url);
  const appKey = getWorkspaceAppKey(pathname);
  return appKey ? `app:${appKey}` : pathname;
};

export const buildWorkspaceRecentsKey = (userId: string, scopeKey: string) =>
  `workspace-recents:v1:${encodeURIComponent(userId)}:${scopeKey}`;

/** 用 URL 生成最近打开标题；首页 / 工作台本身不作为入口。 */
export const titleForWorkspaceRecent = (url: string, fallback: string) => {
  const pathname = pathOf(url);
  const appKey = getWorkspaceAppKey(pathname);
  if (appKey) {
    return getAppDefinition(appKey)?.title ?? fallback;
  }

  const statsPageKey = getWorkspaceStatsPageKey(pathname);
  if (statsPageKey) {
    return STATS_PAGE_TITLES[statsPageKey] ?? fallback;
  }

  const platformPageKey = getWorkspacePlatformPageKey(pathname);
  if (platformPageKey && platformPageKey in PLATFORM_PAGE_TITLES) {
    return PLATFORM_PAGE_TITLES[platformPageKey];
  }

  const organizationPageKey = getWorkspaceOrganizationPageKey(pathname);
  if (organizationPageKey && organizationPageKey in ORGANIZATION_PAGE_TITLES) {
    return ORGANIZATION_PAGE_TITLES[organizationPageKey];
  }

  return fallback;
};

export const readWorkspaceRecents = (
  userId: string,
  scopeKey: string,
): WorkspaceRecent[] => {
  if (!userId || !scopeKey || typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(
      buildWorkspaceRecentsKey(userId, scopeKey),
    );
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is WorkspaceRecent =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as WorkspaceRecent).title === 'string' &&
          typeof (item as WorkspaceRecent).url === 'string',
      )
      .slice(0, WORKSPACE_RECENT_LIMIT);
  } catch {
    return [];
  }
};

const writeWorkspaceRecents = (
  userId: string,
  scopeKey: string,
  recents: WorkspaceRecent[],
) => {
  try {
    window.sessionStorage.setItem(
      buildWorkspaceRecentsKey(userId, scopeKey),
      JSON.stringify(recents),
    );
  } catch {
    // 隐私模式或配额不足时，快速入口保持当前内存态。
  }
};

export const pushWorkspaceRecent = (
  userId: string,
  scopeKey: string,
  recent: WorkspaceRecent,
  homeUrl: string,
) => {
  if (!userId || !scopeKey || typeof window === 'undefined') return;
  if (pathOf(recent.url) === pathOf(homeUrl)) return;

  writeWorkspaceRecents(
    userId,
    scopeKey,
    [
      recent,
      ...readWorkspaceRecents(userId, scopeKey).filter(
        (item) => recentKey(item.url) !== recentKey(recent.url),
      ),
    ].slice(0, WORKSPACE_RECENT_LIMIT),
  );
};

export const removeWorkspaceRecent = (
  userId: string,
  scopeKey: string,
  url: string,
) => {
  if (!userId || !scopeKey || typeof window === 'undefined') return;

  writeWorkspaceRecents(
    userId,
    scopeKey,
    readWorkspaceRecents(userId, scopeKey).filter(
      (item) => recentKey(item.url) !== recentKey(url),
    ),
  );
};
