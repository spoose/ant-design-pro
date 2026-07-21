import { useLocation, useModel } from '@umijs/max';
import { useEffect, useMemo } from 'react';
import { getSkillDefinition } from '@/config/skillRegistry';
import { useWorkspaceTabs } from '@/hooks/useWorkspaceTabs';
import {
  getOrganizationHomePath,
  getPlatformHomePath,
  getWorkspaceAppKey,
  getWorkspaceOrganizationId,
  isPlatformWorkspacePath,
} from '@/utils/workspaceRoutes';
import {
  getOrganizationAccess,
  getPlatformAccess,
} from '@/utils/workspaceRules';
import {
  buildWorkspaceScopeKey,
  buildWorkspaceTabId,
  type WorkspaceTabInput,
} from '@/utils/workspaceState';
import WorkspaceTabsBar from '../WorkspaceTabsBar';

type WorkspaceTabsControllerProps = {
  activeTab: WorkspaceTabInput;
  homeTab: WorkspaceTabInput & { kind: 'home' };
  scopeKey: string;
  userId: string;
};

/**
 * 一个 Scope 内的标签控制器。它是标签状态的唯一 React 消费方，因此无需额外全局 Model。
 */
const WorkspaceTabsController = ({
  activeTab,
  homeTab,
  scopeKey,
  userId,
}: WorkspaceTabsControllerProps) => {
  const activeTabId = buildWorkspaceTabId(activeTab);
  const { tabs, activateTab, closeTab, upsertRouteTab } = useWorkspaceTabs(
    userId,
    scopeKey,
    activeTabId,
    homeTab,
  );

  useEffect(() => {
    upsertRouteTab(activeTab);
  }, [activeTab, upsertRouteTab]);

  return (
    <WorkspaceTabsBar
      activeTabId={activeTabId}
      tabs={tabs}
      onActivate={activateTab}
      onClose={closeTab}
    />
  );
};

/**
 * ProLayout 顶栏中的应用标签。
 *
 * URL 同时决定 Scope 和当前标签：Platform/Organization 只隔离快照，首页/App 才是标签。
 * Sidebar 也直接解析同一 URL，因此两者无需维护额外联动 State。
 */
const WorkspaceTabsHeader = () => {
  // currentUser 来源于 GET /api/currentUser；它提供用户 ID、组织白名单和 App 授权。
  const { initialState } = useModel('@@initialState');
  // pathname/search/hash 来源于 Umi Browser Router，刷新后浏览器会天然保留当前活动 URL。
  const { pathname, search, hash } = useLocation();
  const currentUser = initialState?.currentUser;
  const currentUrl = pathname + search + hash;

  /**
   * 把当前 URL 与 currentUser 转成标签控制器输入：
   * URL -> Scope/App -> 授权校验 -> homeTab/activeTab/scopeKey -> useWorkspaceTabs。
   */
  const routeState = useMemo(() => {
    if (!currentUser?.userid) return undefined;

    const appKey = getWorkspaceAppKey(pathname);
    if (isPlatformWorkspacePath(pathname)) {
      const platformAccess = getPlatformAccess(currentUser);
      if (
        !platformAccess.canEnterManagementCenter ||
        (appKey && !platformAccess.canUseSkill(appKey))
      ) {
        return undefined;
      }
      const homeTab = {
        kind: 'home' as const,
        title: '管理中心',
        url: getPlatformHomePath(),
      };
      const activeTab: WorkspaceTabInput = appKey
        ? {
            kind: 'app',
            appKey,
            title: getSkillDefinition(appKey)?.title ?? appKey,
            url: currentUrl,
          }
        : { ...homeTab, url: currentUrl };

      return {
        activeTab,
        homeTab,
        scopeKey: buildWorkspaceScopeKey({ kind: 'platform' }),
        userId: currentUser.userid,
      };
    }

    const organizationId = getWorkspaceOrganizationId(pathname);
    if (!organizationId) return undefined;
    const organizationAccess = getOrganizationAccess(
      currentUser,
      organizationId,
    );
    const organization = organizationAccess.organization;
    if (!organization || (appKey && !organizationAccess.canUseSkill(appKey))) {
      return undefined;
    }

    const homeTab = {
      kind: 'home' as const,
      title: '首页',
      url: getOrganizationHomePath(organization.organizationId),
    };
    const activeTab: WorkspaceTabInput = appKey
      ? {
          kind: 'app',
          appKey,
          title: getSkillDefinition(appKey)?.title ?? appKey,
          url: currentUrl,
        }
      : { ...homeTab, url: currentUrl };

    return {
      activeTab,
      homeTab,
      scopeKey: buildWorkspaceScopeKey({
        kind: 'organization',
        organizationId: organization.organizationId,
      }),
      userId: currentUser.userid,
    };
  }, [currentUrl, currentUser, pathname]);

  if (!routeState) return null;

  return <WorkspaceTabsController key={routeState.scopeKey} {...routeState} />;
};

export default WorkspaceTabsHeader;
