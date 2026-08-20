import type { CSSProperties } from 'react';

/** 品牌灰阶：Logo 底色比通用品牌表面深一级，保证浅色背景下仍有轮廓。 */
export const brandColors = {
  surface: '#f5f5f5',
  logoSurface: '#e8bf85',
  logoInk: '#09090b',
} as const;

/**
 * 表面 / 选中类色值：与 DESIGN.md 对齐。
 * 状态色请用 statusColors；行内操作色请用 actionColors。
 */
export const surfaceColors = {
  /**
   * 选中浅底：侧栏菜单选中、antd colorPrimaryBg 覆盖等。
   * 主色偏深时算法生成的 colorPrimaryBg 过深，用此色解耦。
   */
  selectedSoft: brandColors.surface,
  hoverSoft: brandColors.surface,
  /** 导航 hover / 选中底：低饱和浅蓝，白壳上可辨、不抢主色。 */
  navChromeRaised: '#e8eef5',
  /** 标签激活：图标、文字、底部指示条。 */
  navActiveInk: '#3b82f6',
} as const;

/** Workspace 身份标识与组织图标共用的中性颜色。 */
export const workspaceIconColors = {
  background: brandColors.logoSurface,
  foreground: '#3f3f46',
  backgroundDark: '#27272a',
  foregroundDark: '#d4d4d8',
} as const;

/** 通过 CSS 自定义属性让 Tailwind 明暗主题类复用同一组 TypeScript 颜色变量。 */
export const workspaceIconColorVariables = {
  '--workspace-icon-background': workspaceIconColors.background,
  '--workspace-icon-foreground': workspaceIconColors.foreground,
  '--workspace-icon-background-dark': workspaceIconColors.backgroundDark,
  '--workspace-icon-foreground-dark': workspaceIconColors.foregroundDark,
} as CSSProperties;
