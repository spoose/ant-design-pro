import { useNavigate } from '@umijs/max';
import { useCallback, useEffect, useState } from 'react';
import {
  readWorkspaceSession,
  writeWorkspaceSession,
} from '@/utils/workspaceSession';
import {
  createWorkspaceTab,
  type WorkspaceState,
  type WorkspaceTabInput,
} from '@/utils/workspaceState';

/**
 * 读取当前用户和 Scope 的标签快照，并注入固定首页标签。
 */
const createInitialWorkspace = (
  userId: string,
  scopeKey: string,
  homeTabInput: WorkspaceTabInput & { kind: 'home' },
): WorkspaceState => {
  const restoredWorkspace = readWorkspaceSession(userId, scopeKey);
  const defaultHomeTab = createWorkspaceTab(homeTabInput);
  const restoredHomeTab = restoredWorkspace.tabs.find(
    (tab) => tab.id === defaultHomeTab.id,
  );
  // 保留首页上次访问的内部 URL，同时使用当前 Scope 定义的标题。
  const homeTab = restoredHomeTab
    ? { ...restoredHomeTab, title: defaultHomeTab.title }
    : defaultHomeTab;

  return {
    tabs: [
      homeTab,
      ...restoredWorkspace.tabs.filter(
        (tab) => tab.id !== defaultHomeTab.id && tab.kind === 'app',
      ),
    ],
  };
};

/**
 * Workspace 标签的最小 React 控制器。
 *
 * @param userId 来源于 POST /api/currentUser/get 的 userId，用于隔离 sessionStorage 快照。
 * @param scopeKey 来源于 Platform/Organization Scope，用于隔离恢复快照。
 * @param activeTabId 来源于当前 Umi URL 对应的 routeTab，不在 Hook 内重复保存。
 * @returns 已打开标签，以及路由同步、点击激活和关闭三个操作。
 *
 * 链路：sessionStorage -> useState 惰性初始化 -> antd Tabs；
 * Umi URL -> activeTabId；用户点击标签 -> useNavigate() -> 新 URL。
 */
export const useWorkspaceTabs = (
  userId: string,
  scopeKey: string,
  activeTabId: string,
  homeTab: WorkspaceTabInput & { kind: 'home' },
) => {
  const navigate = useNavigate();
  // Storage 只在该 Hook 首次挂载时读取一次，刷新恢复的是标签集合而不是当前 URL。
  const [workspace, setWorkspace] = useState(() =>
    createInitialWorkspace(userId, scopeKey, homeTab),
  );

  /** tabs 变化后保存最小快照；当前激活标签由地址栏天然保留。 */
  useEffect(() => {
    writeWorkspaceSession(userId, scopeKey, workspace);
  }, [scopeKey, userId, workspace]);

  /**
   * 把当前路由代表的标签插入或更新到标签集合。
   * 相同业务 ID 会更新标题和最后 URL，但保留原显示位置。
   */
  const upsertRouteTab = useCallback((input: WorkspaceTabInput) => {
    const routeTab = createWorkspaceTab(input);

    setWorkspace((currentState) => {
      const existingIndex = currentState.tabs.findIndex(
        (tab) => tab.id === routeTab.id,
      );
      if (existingIndex === -1) {
        return { tabs: [...currentState.tabs, routeTab] };
      }

      const existingTab = currentState.tabs[existingIndex];
      if (
        existingTab.title === routeTab.title &&
        existingTab.url === routeTab.url
      ) {
        return currentState;
      }

      const tabs = [...currentState.tabs];
      tabs[existingIndex] = routeTab;
      return { tabs };
    });
  }, []);

  /** 点击已有标签时只进入其最后 URL；activeKey 将由新 URL 自动派生。 */
  const activateTab = useCallback(
    (tabId: string) => {
      const targetTab = workspace.tabs.find((tab) => tab.id === tabId);
      if (targetTab) navigate(targetTab.url);
    },
    [navigate, workspace.tabs],
  );

  /** 处理 antd onEdit 关闭事件；关闭当前路由标签时进入相邻标签。 */
  const closeTab = useCallback(
    (tabId: string) => {
      const closingIndex = workspace.tabs.findIndex((tab) => tab.id === tabId);
      const closingTab = workspace.tabs[closingIndex];
      // home 对应的 antd item会设置 closable: false，这里保持同一业务规则。
      if (!closingTab || closingTab.kind === 'home') return;

      const tabs = workspace.tabs.filter((tab) => tab.id !== tabId);
      setWorkspace({ tabs });

      if (activeTabId !== tabId) return;

      // antd onEdit 只给出被关闭 key；相邻选择属于产品规则，而不是 Router 默认行为。
      const nextActiveTab = tabs[Math.min(closingIndex, tabs.length - 1)];
      if (nextActiveTab) {
        // replace 避免浏览器后退重新进入刚关闭的标签 URL。
        navigate(nextActiveTab.url, { replace: true });
      }
    },
    [activeTabId, navigate, workspace.tabs],
  );

  return {
    /** 已打开标签及其显示顺序，直接映射为 antd Tabs items。 */
    tabs: workspace.tabs,
    upsertRouteTab,
    activateTab,
    closeTab,
  };
};
