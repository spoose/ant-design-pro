---
name: JU SHU
description: Platform 与 Organization 统一入口及应用标签工作台
colors:
  brand: "#f5f5f5"
  primary: "#000000e3"
  primary-hover: "#0d0d0d"
  primary-active: "#000000"
  primary-soft: "#f5f5f5"
  primary-border: "#262626"
  canvas: "#f5f5f5"
  surface: "#ffffff"
  ink: "#000000e0"
  ink-secondary: "#000000a6"
  ink-tertiary: "#00000073"
  divider: "#d9d9d9"
  divider-subtle: "#f0f0f0"
  work-ink: "#09090b"
  work-muted: "#52525c"
  work-surface: "#f4f4f5"
  work-divider: "#e4e4e7"
  on-primary: "#ffffff"
  success: "#54915c"
  success-soft: "#d9fbdd"
  warning: "#534212"
  warning-soft: "#fff7cf"
  error: "#9a2827"
  error-soft: "#ecdbd9"
  action: "#3f3f46"
  action-soft: "#ebebed"
  selected-soft: "#f5f5f5"
  hover-soft: "#f5f5f5"
typography:
  headline:
    fontFamily: "AlibabaSans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0"
  title:
    fontFamily: "AlibabaSans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0"
  body:
    fontFamily: "AlibabaSans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5714
    letterSpacing: "0"
  label:
    fontFamily: "AlibabaSans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0"
  code:
    fontFamily: "SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "4px 15px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "4px 15px"
    height: "32px"
  button-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 8px"
    height: "36px"
  input-filled:
    backgroundColor: "{colors.work-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "4px 11px"
    height: "32px"
  permission-chip:
    backgroundColor: "{colors.work-surface}"
    textColor: "{colors.work-muted}"
    typography: "{typography.code}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  status-pill-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    typography: "{typography.label}"
    rounded: "999px"
    padding: "2px 10px"
  status-pill-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    typography: "{typography.label}"
    rounded: "999px"
    padding: "2px 10px"
  status-pill-error:
    backgroundColor: "{colors.error-soft}"
    textColor: "{colors.error}"
    typography: "{typography.label}"
    rounded: "999px"
    padding: "2px 10px"
  action-pill:
    backgroundColor: "{colors.action-soft}"
    textColor: "{colors.action}"
    typography: "{typography.label}"
    rounded: "999px"
    padding: "2px 10px"
  skill-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.work-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "12px"
  workspace-option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "56px"
  nav-item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
---

# Design System: JU SHU

## 1. Overview

**Creative North Star: "有序工作台"**

JU SHU 是一个冷静、清晰、可信的企业工作界面。它像整理良好的工作台：当前 Platform 或 Organization 始终明确，已授权的权限与 Skill 位于直接可达的位置，不相关的信息退到背景中。视觉层级服务于工作区范围、权限状态和操作路径，而不是展示设计本身。

系统采用桌面优先的响应式结构，保持固定、紧凑的界面字号和基于 4px 的间距节奏。Ant Design 提供熟悉的交互语法，Tailwind 只补充业务页面布局和工作灰；两者必须共享同一套颜色、圆角和密度判断。

界面明确拒绝营销官网式的大幅 Hero、口号和装饰性卡片，也拒绝术语堆叠的技术控制台感，以及高饱和、夸张动效和游戏化反馈构成的消费娱乐感。

**Key Characteristics:**

- 中性品牌灰建立识别表面，近黑主交互与工作灰承担信息层级。
- 紧凑而不拥挤，常用操作在一至两步内可达。
- WorkspaceScope、Sidebar、权限、Skill 与业务请求保持一致。
- 常驻表面平坦，浮层和瞬时状态才获得抬升。
- 使用成熟、标准的企业软件交互模式。

## 2. Colors

颜色策略是“品牌灰 + 黑白主交互 + 工作灰”：`#f5f5f5` 统一品牌表面、选中和 hover 的浅层背景，近黑色承担主要操作与焦点，其他灰阶负责结构；成功 / 警示 / 错误使用低饱和状态色对（墨色 + 浅底）。

### Primary

- **品牌表面灰** (`#f5f5f5`)：用于页面画布、选中背景与轻量 hover，不作为正文或状态含义的唯一载体。
- **主交互色** (`#000000e3`)：来源于 `config/defaultSettings.ts` 的 `colorPrimary`，用于主要按钮、链接和焦点锚点。
- **主交互 hover / active**：由 Ant Design 算法从主交互色派生，当前分别为 `#0d0d0d` 与 `#000000`。
- **选中与 hover 浅层** (`#f5f5f5`)：来源于 `src/theme/colors.ts` 的 `surfaceColors.selectedSoft` 与 `hoverSoft`。

### Secondary（状态色）

语义名保留 `success` / `warning` / `error`，视觉替换为截图中的 Running / Idle / Error 色对。每组包含 **ink（墨色）** 与 **soft（浅底）**：

| 语义 | 产品别名 | ink（文字 / 图标 / 圆点） | soft（胶囊底） |
|------|----------|---------------------------|----------------|
| success | Running | `#54915c` | `#d9fbdd` |
| warning | Idle | `#534212` | `#fff7cf` |
| error | Error | `#9a2827` | `#ecdbd9` |

- **ink**：用于状态文字、列表圆点、描边和图标着色。
- **soft**：只用于状态胶囊 / Badge 底色；不要单独铺满大面积表面。
- 组织「已启用」映射 success（Running）；「已停用 / 待机」映射 warning（Idle）；失败与阻断映射 error。
- antd 的 `Tag color="success|warning|error"` 仍走组件库默认色；业务状态胶囊请使用本色对，避免两套绿红并存。

### Action（行内操作色）

用于「进入」「编辑」等次要行内操作胶囊，与状态色并列、不抢主色：

| 语义 | ink（文字） | soft（胶囊底） |
|------|-------------|----------------|
| action | `#3f3f46` | `#ebebed` |

- **soft**：石墨灰浅底，只用于操作胶囊，不铺大面积。
- **ink**：冷深灰，保证在石墨底上可读；不使用主交互色做行内次要操作，以免与主按钮抢层级。
- 「删除」等危险操作：使用 error 色对（文字 `#9a2827` + 底 `#ecdbd9`），与进入 / 编辑的 action 胶囊区分。

### Neutral

- **画布灰** (`#f5f5f5`) 与 **表面白** (`#ffffff`)：区分应用背景和内容表面，不依靠常驻阴影制造层级。
- **主墨色** (`#000000e0`)：正文、标题和关键数据；次级与三级信息分别使用 `#000000a6` 和 `#00000073`。
- **工作黑** (`#09090b`) 与 **工作灰** (`#52525c`)：用于权限与 Skill 概览中的高对比信息层级。
- **分隔线** (`#d9d9d9`) 与 **轻分隔线** (`#f0f0f0`)：前者标记控件边界，后者划分大面积内容。
- **品牌 / 选中 / hover 浅底** (`#f5f5f5`)：代码常量见 `src/theme/colors.ts` → `surfaceColors.selectedSoft` 与 `hoverSoft`，同时作为 `colorPrimaryBg` 和交互 hover token 的显式覆盖。

### Named Rules

**The Neutral Brand Rule.** 品牌灰只建立表面识别和低强调交互反馈；主要操作使用近黑色，状态只使用各自的语义色对。

**The Semantic Color Rule.** `success` / `warning` / `error` 只能表达状态含义，且必须成对使用 ink + soft（或至少保留 ink 文案）；同一状态在 Platform 与所有 Organization 中必须保持相同颜色。不得用品牌灰或主交互色表达成功、警示或错误。

## 3. Typography

**Display Font:** 不设置独立展示字体；认证后的产品界面不使用营销式展示字。

**Body Font:** AlibabaSans，回退到系统无衬线字体。

**Label/Mono Font:** 权限码、Skill Code 和技术标识使用 SFMono-Regular、Consolas 或等宽系统字体。

**Character:** 单一无衬线家族保持专业与效率，依靠字重、字号和间距建立层级。所有界面文字的 letter-spacing 固定为 `0`，不使用大写追踪字制造装饰感。

### Hierarchy

- **Headline** (600, 24px, 1.4)：仅用于登录、入口选择等独立流程的页面标题。
- **Title** (600, 20px, 1.4)：用于当前 Organization、App 名称和页面级重点，不在紧凑面板内放大。
- **Body** (400, 14px, 1.5714)：默认正文、表单和按钮文字；连续说明文本限制在 65–75ch。
- **Label** (500, 12px, 1.5)：用于计数、辅助元数据和紧凑标签，不承担主要操作名称。
- **Code** (400, 12px, 1.5)：只用于权限码、Skill Code 和系统标识，长值必须允许换行。

### Named Rules

**The One Family Rule.** 标题、正文、按钮和数据统一使用 AlibabaSans；不得在 UI 标签中引入展示字体或相似的第二套无衬线字体。

## 4. Elevation

系统采用结构分层。常驻页面、卡片和选择项在静止状态下依靠画布色、表面色与 1px 边界表达关系，不使用装饰性阴影。菜单、下拉框、弹窗等脱离文档流的浮层使用 Ant Design 的环境阴影，交互结束后层级随浮层一起消失。

### Shadow Vocabulary

- **浮层环境阴影** (`0 6px 16px rgba(0,0,0,0.08), 0 3px 6px -4px rgba(0,0,0,0.12), 0 9px 28px 8px rgba(0,0,0,0.05)`)：仅用于下拉菜单、Popover、Modal 等真实浮层。

### Named Rules

**The Flat-at-Rest Rule.** 常驻表面默认平坦；如果一个模块不覆盖其他内容，它就不应获得浮层阴影。

## 5. Components

组件气质是克制、功能明确、紧凑。标准控件沿用 Ant Design v6，不为视觉差异重新发明交互方式；业务组件只在标准语法上补充 WorkspaceScope 与权限信息。

### Buttons

- **Shape:** 轻微圆角 (`6px`)，默认高度 `32px`，大号流程按钮高度 `40px`。
- **Primary:** 近黑背景（`#000000e3`）、白色文字，默认水平内边距 `15px`；一个操作区只保留一个主按钮。
- **Hover / Focus:** hover 使用 `#0d0d0d`，active 使用 `#000000`；focus-visible 必须保留清晰的近黑焦点环。
- **Text:** 顶栏操作使用透明背景、`36px` 高度和 `8px` 水平内边距，只在 hover 时出现轻灰底色。
- **Disabled / Loading:** 使用 Ant Design 的标准禁用和加载状态，不通过降低文字对比度到不可读来表达禁用。

### Chips

- **Style:** 权限码使用工作灰浅底、工作灰文字、`4px` 圆角和 `4px 8px` 内边距。
- **State:** 权限 Chip 是只读信息，不模拟按钮 hover；可操作标签必须使用独立的交互样式和焦点状态。

### Cards / Containers

- **Corner Style:** 卡片使用轻微圆角 (`8px`)，不使用大于 `16px` 的业务卡片圆角。
- **Background:** 内容表面保持白色；图标容器可使用品牌灰 `#f5f5f5`，但不铺满整张卡片。
- **Shadow Strategy:** 静止状态无阴影；只有明确可点击的卡片允许在 hover 时使用组件库的轻量反馈。
- **Border:** 使用轻分隔线 (`1px solid #f0f0f0`) 或不设边界，禁止边界与宽大阴影同时出现。
- **Internal Padding:** 紧凑卡片使用 `12px`，标准内容容器使用 `16px` 或 `24px`。

### Inputs / Fields

- **Style:** 全局使用 Ant Design `filled` 变体，浅灰填充、`6px` 圆角、默认高度 `32px`。
- **Focus:** 聚焦后边界与焦点环使用近黑主交互色，文字和输入值保持主墨色。
- **Error / Disabled:** 错误使用标准错误红并附带文字说明；禁用态保持可辨识标签，不只依赖颜色。

### Navigation

- **Style:** 使用 ProLayout 的浅色混合导航；左侧菜单由当前 URL 派生，顶部操作负责 WorkspaceScope、账户和全局工具。
- **Active:** 当前菜单使用近黑文字和品牌灰背景，hover 使用同一 `#f5f5f5` 浅层反馈。
- **Responsive:** 窄屏折叠侧栏并保留图标与可访问名称；不得通过缩放字体适配视口。

### Workspace Switch

- 顶栏 WorkspaceScope 切换使用与相邻操作一致的图标按钮；下拉菜单并列显示 Platform 与可进入的 Organization，并标记当前项。
- Platform 与不同 Organization 不能同时运行。切换使用整页导航，以卸载旧 Scope 的组件、请求和内存状态；每个 Scope 的 App 标签快照独立恢复。

## 6. Do's and Don'ts

### Do:

- **Do** 让当前 WorkspaceScope 可核对，并让 URL、Sidebar、权限、Skill 与请求 Header 同步变化。
- **Do** 使用 `4/8/12/16/24/32px` 间距和 `4/6/8px` 圆角层级维持紧凑、可预测的节奏。
- **Do** 将品牌灰 (`#f5f5f5`) 用于画布、选中和 hover 浅层；主要操作使用近黑色，并由工作灰承担普通信息层级。
- **Do** 为按钮、输入、菜单和可点击卡片提供 default、hover、focus、active、disabled 与 loading 状态。
- **Do** 尊重 `prefers-reduced-motion`；常规状态过渡保持在 `100–200ms`，不编排页面入场动画。

### Don't:

- **Don't** 采用营销官网式的大幅 Hero、口号和装饰性卡片。
- **Don't** 堆叠术语和无层次的高密度状态来制造技术控制台感。
- **Don't** 使用高饱和颜色、夸张动效或游戏化反馈来营造消费娱乐产品感。
- **Don't** 嵌套卡片，或在同一表面同时使用 `1px` 边界和模糊半径大于 `8px` 的装饰阴影。
- **Don't** 用颜色作为权限、错误或选中状态的唯一表达方式。
- **Don't** 在按钮、标签和数据中使用展示字体、负字距或全大写追踪字。
