/**
 * Octop（章鱼）AI 应用入口地址。
 * 浏览器构建期由 config/config.ts 的 define 注入 OCTOP_BASE_URL；
 * vitest / SSR 不经过 define，回落到同一本地默认值。
 */
export const OCTOP_BASE_URL =
  process.env.OCTOP_BASE_URL || 'http://localhost:5173/';
