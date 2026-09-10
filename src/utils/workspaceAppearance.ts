/**
 * Workspace 外观偏好。
 *
 * 数据链路：头像「主题设置」抽屉写入 localStorage -> 启动时与切换时把枚举值写到
 * <html data-workspace-background> -> global.less 在 .workspace-layout 内注入
 * --workspace-page-background -> WorkspacePage / pAI 页面消费该变量。
 * 存枚举而不存颜色，换色值不需要迁移已有偏好。
 */

export type WorkspaceBackground = 'classic' | 'cool';

/** 阶段一为全局键；将来按用户隔离时在这里追加 userId 后缀即可。 */
export const WORKSPACE_APPEARANCE_STORAGE_KEY = 'workspace-appearance:v1';

/** 挂在 <html> 上，供 global.less 的 .workspace-layout 作用域规则消费。 */
export const WORKSPACE_BACKGROUND_ATTRIBUTE = 'data-workspace-background';

export const WORKSPACE_BACKGROUND_VALUES: readonly WorkspaceBackground[] = [
  'classic',
  'cool',
];

/** 存储内容不可信：非法、缺省或损坏一律回落默认值。 */
export const normalizeWorkspaceBackground = (
  value: unknown,
): WorkspaceBackground =>
  typeof value === 'string' &&
  (WORKSPACE_BACKGROUND_VALUES as readonly string[]).includes(value)
    ? (value as WorkspaceBackground)
    : 'classic';

export const readWorkspaceBackground = (): WorkspaceBackground => {
  if (typeof window === 'undefined') return 'classic';
  try {
    return normalizeWorkspaceBackground(
      window.localStorage.getItem(WORKSPACE_APPEARANCE_STORAGE_KEY),
    );
  } catch {
    return 'classic';
  }
};

export const writeWorkspaceBackground = (value: WorkspaceBackground) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WORKSPACE_APPEARANCE_STORAGE_KEY, value);
  } catch {
    // 隐私模式或配额不足时保持当前内存态。
  }
};

/** classic 直接移除属性，页面回落到 antd colorBgLayout，默认态不引入额外样式分支。 */
export const applyWorkspaceBackground = (value: WorkspaceBackground) => {
  if (typeof document === 'undefined') return;
  const { documentElement } = document;
  if (value === 'classic') {
    documentElement.removeAttribute(WORKSPACE_BACKGROUND_ATTRIBUTE);
    return;
  }
  documentElement.setAttribute(WORKSPACE_BACKGROUND_ATTRIBUTE, value);
};
