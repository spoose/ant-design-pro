/**
 * 圆角层级：与 DESIGN.md 对齐（4 / 6 / 8px）。
 * 业务卡片一般不超过 16px；全圆（pill）用 CSS `9999px` / Tailwind `rounded-full`，不入此表。
 *
 * - antd 控件默认仍走 ConfigProvider `token.borderRadius`
 * - Workspace 业务面（ProTable 查询/列表卡等）优先引用本文件，避免页面魔法数分叉
 */
export const radii = {
  /** Chip / 小标签 */
  xs: 4,
  /** 按钮、输入等控件（DESIGN 约定；与 antd token 对齐时写 config） */
  sm: 6,
  /** 标准卡片 / 容器 */
  md: 8,
  /** ProTable 查询卡与列表卡等业务表格面 */
  tableCard: 8,
  /** 业务卡片上限提示值，勿日常直接用更大值 */
  cardMax: 16,
} as const;

export type RadiusToken = keyof typeof radii;
