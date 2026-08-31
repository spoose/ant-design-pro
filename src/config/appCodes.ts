/**
 * 前端当前注册的全部应用代码，是离线 XOne“应用权限暂时全开”策略的唯一数据源。
 * 新增应用时必须先更新此列表，appRegistry 的类型检查会要求同步提供页面定义。
 */
export const ALL_APP_CODES = [
  'ai-assistant',
  'integrated-operations',
  'drone-operations',
  'file-review',
  'document-summary',
  'knowledge-search',
] as const;

export type AppCode = (typeof ALL_APP_CODES)[number];
