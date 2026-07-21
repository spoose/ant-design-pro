import {
  createEmptyWorkspaceState,
  type WorkspaceState,
  type WorkspaceTab,
} from './workspaceState';

/**
 * Workspace 的最小 sessionStorage 层。
 *
 * 只保存 WorkspaceState，也就是已打开标签、顺序和每个标签最后 URL。
 * 当前激活标签由浏览器 URL 决定，不写入 Storage。
 * 不保存页面接口数据、表单值、滚动位置或 React 组件实例。
 */

/**
 * 使用版本化 Key，并按登录用户和当前 Scope 隔离恢复记录。
 * v3 移除 Organization 根标签和跨 Organization 标签共存，旧快照无需迁移。
 */
export const buildWorkspaceStorageKey = (userId: string, scopeKey: string) =>
  `workspace-tabs:v3:${encodeURIComponent(userId)}:${scopeKey}`;

/** 判断 Storage 中的未知值是否包含标签栏渲染所需的基本字段。 */
const isWorkspaceTab = (value: unknown): value is WorkspaceTab => {
  if (typeof value !== 'object' || value === null) return false;

  const tab = value as Partial<WorkspaceTab>;
  return (
    (tab.kind === 'home' || tab.kind === 'app') &&
    typeof tab.id === 'string' &&
    typeof tab.title === 'string' &&
    typeof tab.url === 'string'
  );
};

/**
 * 从当前用户的 sessionStorage 恢复 WorkspaceState。
 * JSON 损坏或结构不完整时安全回退，不阻断页面启动。
 */
export const readWorkspaceSession = (
  userId: string,
  scopeKey: string,
): WorkspaceState => {
  if (!userId || !scopeKey || typeof window === 'undefined') {
    return createEmptyWorkspaceState();
  }

  try {
    const rawSnapshot = window.sessionStorage.getItem(
      buildWorkspaceStorageKey(userId, scopeKey),
    );
    if (!rawSnapshot) return createEmptyWorkspaceState();

    const snapshot = JSON.parse(rawSnapshot) as Partial<WorkspaceState>;
    if (!Array.isArray(snapshot.tabs)) return createEmptyWorkspaceState();

    // 只保留可渲染标签并按 ID 去重，避免损坏快照产生重复 React key。
    const seenTabIds = new Set<string>();
    const tabs = snapshot.tabs.filter((tab) => {
      if (!isWorkspaceTab(tab) || seenTabIds.has(tab.id)) return false;
      seenTabIds.add(tab.id);
      return true;
    });
    return { tabs };
  } catch {
    return createEmptyWorkspaceState();
  }
};

/** 标签状态变化后，把最小 WorkspaceState 写入当前用户的 sessionStorage。 */
export const writeWorkspaceSession = (
  userId: string,
  scopeKey: string,
  state: WorkspaceState,
) => {
  if (!userId || !scopeKey || typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(
      buildWorkspaceStorageKey(userId, scopeKey),
      JSON.stringify(state),
    );
  } catch {
    // 隐私模式、Storage 被禁用或容量不足时，标签仍可在当前内存中正常工作。
  }
};

/** 用户退出或主动重置工作区时，删除该用户的标签恢复记录。 */
export const clearWorkspaceSession = (userId: string, scopeKey: string) => {
  if (!userId || !scopeKey || typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(
      buildWorkspaceStorageKey(userId, scopeKey),
    );
  } catch {
    // Storage 不可用时无需继续处理。
  }
};
