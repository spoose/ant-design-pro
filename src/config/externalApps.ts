/**
 * Octop（章鱼）普通入口，用于内嵌和独立打开。
 * 浏览器构建期由 config/config.ts 的 define 注入 OCTOP_BASE_URL；
 * vitest / SSR 不经过 define，回落到同一本地默认值。
 */
export const OCTOP_BASE_URL =
  process.env.OCTOP_BASE_URL || 'http://localhost:5173/';

const octopEntry = new URL(OCTOP_BASE_URL, 'http://localhost');
if (
  !['http:', 'https:'].includes(octopEntry.protocol) ||
  octopEntry.username ||
  octopEntry.password
) {
  throw new Error('OCTOP_BASE_URL must be an HTTP(S) URL without credentials');
}

/**
 * 浏览器可访问的 XOne 公网入口，供 Octop 免登 launch 顶层导航使用。
 * 与工作台同源部署时留空；开发代理目标不会自动暴露到浏览器。
 */
export const XONE_PUBLIC_BASE_URL = process.env.XONE_PUBLIC_BASE_URL || '';
