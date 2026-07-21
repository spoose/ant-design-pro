/**
 * Workspace 标签的最小状态模型。
 *
 * 数据链路：Umi 当前路由 -> WorkspaceTabsHeader -> useWorkspaceTabs()
 * -> WorkspaceState -> antd Tabs。
 *
 * 当前阶段只解决标签打开、切换、关闭和刷新恢复，不保存页面接口数据或组件 State。
 */

/**
 * 新工作区只保留两类标签：固定首页和可关闭应用。
 * Platform/Organization 是整个页面的 Scope，不再作为标签类型。
 */
export type WorkspaceTabKind = 'home' | 'app';

/**
 * 标签快照的隔离范围。组织切换会刷新页面，不同 Scope 的标签不会同时显示。
 */
export type WorkspaceScope =
  | { kind: 'platform' }
  | { kind: 'organization'; organizationId: string };

/** 所有标签共有的展示与路由字段。 */
type WorkspaceTabBaseInput = {
  /** 标签标题，来源于页面或系统/App 注册信息。 */
  title: string;
  /** 标签对应的完整 Umi URL，点击切换时交给 useNavigate()。 */
  url: string;
};

/**
 * 创建标签所需的最小业务身份。
 * Scope 已由 Storage Key 隔离，因此 App 标签只需要稳定 appKey。
 */
export type WorkspaceTabInput =
  | (WorkspaceTabBaseInput & { kind: 'home' })
  | (WorkspaceTabBaseInput & {
      kind: 'app';
      appKey: string;
    });

/** 标签栏直接消费的完整标签记录。 */
export type WorkspaceTab = WorkspaceTabInput & {
  /** 稳定标签 ID，用作 antd Tabs key，同一业务标签重复打开时复用。 */
  id: string;
};

/**
 * Workspace 唯一持久化状态。
 * tabs 保存已打开标签、顺序和最后 URL；activeTabId 直接从当前 Umi 路由派生，不重复保存。
 */
export type WorkspaceState = {
  tabs: WorkspaceTab[];
};

/** 没有恢复记录时使用的新状态，函数形式避免调用方共享可变数组。 */
export const createEmptyWorkspaceState = (): WorkspaceState => ({
  tabs: [],
});

/** 把 Organization 编码压缩为侧栏收起时使用的两字符标识。 */
export const getOrganizationBadge = (organizationCode: string) => {
  const normalizedCode = organizationCode.trim().toUpperCase();
  return normalizedCode.slice(0, 2);
};

/** 编码后端 ID，避免 ID 中的冒号与标签 ID 分隔符冲突。 */
const encodeIdPart = (value: string) => encodeURIComponent(value);

/** 根据标签业务身份生成稳定 ID。 */
export const buildWorkspaceTabId = (input: WorkspaceTabInput): string => {
  switch (input.kind) {
    case 'home':
      return 'home';
    case 'app':
      return `app:${encodeIdPart(input.appKey)}`;
  }
};

/** 把当前页面 Scope 转换为 sessionStorage Key 的稳定片段。 */
export const buildWorkspaceScopeKey = (scope: WorkspaceScope) =>
  scope.kind === 'platform'
    ? 'platform'
    : `organization:${encodeIdPart(scope.organizationId)}`;

/**
 * 创建合法标签并集中生成稳定 ID。
 * 调用方只提供业务字段，不需要自行拼接 ID。
 */
export const createWorkspaceTab = (input: WorkspaceTabInput): WorkspaceTab => ({
  ...input,
  id: buildWorkspaceTabId(input),
});
