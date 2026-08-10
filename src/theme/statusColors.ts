/**
 * 语义色对：与 DESIGN.md 对齐。
 * ink 用于文字、图标、圆点；soft 用于胶囊底色。
 * 选中浅底（菜单 selected / colorPrimaryBg）见 `./colors` → surfaceColors。
 */
export const statusColors = {
  success: {
    /** Running ink */
    ink: '#54915c',
    /** Running soft */
    soft: '#d9fbdd',
  },
  warning: {
    /** Idle ink */
    ink: '#534212',
    /** Idle soft */
    soft: '#fff7cf',
  },
  error: {
    /** Error ink */
    ink: '#9a2827',
    /** Error soft */
    soft: '#ecdbd9',
  },
} as const;

/**
 * pAI 能力标签色对。
 * soft 用于淡色背景，ink 用于同色系的深色文字、图标与关闭按钮。
 */
export const tagColors = {
  knowledge: {
    ink: '#8276cc',
    soft: '#ebe9f5',
  },
  webSearch: {
    ink: 'rgba(22,119,255,0.73)',
    soft: '#e6f4ff',
  },
} as const;

/**
 * 平台人员身份色对（与 status / action / pAI tag 分离）。
 * soft = 胶囊底；ink = 文字。
 */
export const identityColors = {
  /** Super Admin */
  admin: {
    ink: '#8276cc',
    soft: '#ebe9f5',
  },
  /** 普通用户 */
  member: {
    ink: '#3f3f46',
    soft: '#ebebed',
  },
} as const;

export type IdentityKind = keyof typeof identityColors;

/** 行内操作色对：进入 / 编辑等次要操作胶囊（石墨底 + 冷深灰字）。 */
export const actionColors = {
  ink: '#3f3f46',
  soft: '#ebebed',
} as const;

export type StatusSemantic = keyof typeof statusColors;

/**
 * 胶囊共用尺寸与字体：固定高度，重置 button/UA 默认样式，
 * `!inline-flex` 与 `w-max` 阻止窄屏表格把直属 span 拉伸为整格宽度；
 * 字号、字重和行高使用 important，避免 button 的组件样式覆盖胶囊排版。
 * 颜色由调用方通过 style 或带色 class 提供；本底类不含背景/文字色。
 */
export const pillClassName =
  'm-0 box-border !inline-flex h-6 min-h-6 max-h-6 w-max shrink-0 items-center justify-center whitespace-nowrap rounded-full border-0 px-2.5 !text-xs !font-medium !leading-none no-underline appearance-none transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 motion-reduce:transition-none';

/** 状态胶囊 class；颜色值与 statusColors 同步。 */
export const statusPillClassName: Record<StatusSemantic, string> = {
  success: `${pillClassName} bg-[#d9fbdd] text-[#54915c]`,
  warning: `${pillClassName} bg-[#fff7cf] text-[#534212]`,
  error: `${pillClassName} bg-[#ecdbd9] text-[#9a2827]`,
};

/** 操作胶囊 class：进入、编辑等；删除请用 statusPillClassName.error。 */
export const actionPillClassName = `${pillClassName} !bg-[#ebebed] !text-[#3f3f46]`;
