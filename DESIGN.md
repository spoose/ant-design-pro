---
name: JU SHU
description: Platform 与 Organization 统一入口及应用标签工作台
colors:
  primary: "#1677ff"
  primary-hover: "#4096ff"
  primary-active: "#0958d9"
  primary-soft: "#e6f4ff"
  primary-border: "#91caff"
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
  success: "#52c41a"
  warning: "#faad14"
  error: "#ff4d4f"
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

- 单一秩序蓝强调色，工作灰承担大部分信息层级。
- 紧凑而不拥挤，常用操作在一至两步内可达。
- WorkspaceScope、Sidebar、权限、Skill 与业务请求保持一致。
- 常驻表面平坦，浮层和瞬时状态才获得抬升。
- 使用成熟、标准的企业软件交互模式。

## 2. Colors

颜色策略是“秩序蓝 + 工作灰”：蓝色只表达主操作、当前选择和关键信息，灰阶承担结构，成功、警告和错误使用独立语义色。

### Primary

- **秩序蓝** (`#1677ff`)：品牌与主交互锚点，用于主要按钮、当前菜单、链接和焦点状态。
- **秩序蓝悬停态** (`#4096ff`)：只用于可交互元素的 hover 反馈。
- **秩序蓝按下态** (`#0958d9`)：只用于 active 状态，避免与常驻选中态混用。
- **秩序蓝浅层** (`#e6f4ff`)：用于选中背景和低强调信息底色；边界使用浅蓝 (`#91caff`)。

### Secondary

- **成功绿** (`#52c41a`)：仅表示操作成功或健康状态。
- **警示金** (`#faad14`)：仅表示需要注意但尚未失败的状态。
- **错误红** (`#ff4d4f`)：仅表示错误、危险操作和阻断状态。

### Neutral

- **画布灰** (`#f5f5f5`) 与 **表面白** (`#ffffff`)：区分应用背景和内容表面，不依靠常驻阴影制造层级。
- **主墨色** (`#000000e0`)：正文、标题和关键数据；次级与三级信息分别使用 `#000000a6` 和 `#00000073`。
- **工作黑** (`#09090b`) 与 **工作灰** (`#52525c`)：用于权限与 Skill 概览中的高对比信息层级。
- **分隔线** (`#d9d9d9`) 与 **轻分隔线** (`#f0f0f0`)：前者标记控件边界，后者划分大面积内容。

### Named Rules

**The One Accent Rule.** 秩序蓝在单个屏幕中的常驻面积不得超过约 10%；它只服务于主操作、选中态和关键状态，绝不作为装饰性铺色。

**The Semantic Color Rule.** 绿色、金色和红色只能表达状态含义；同一状态在 Platform 与所有 Organization 中必须保持相同颜色。

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
- **Primary:** 秩序蓝背景、白色文字，默认水平内边距 `15px`；一个操作区只保留一个主按钮。
- **Hover / Focus:** hover 切换为 `#4096ff`；focus-visible 必须显示清晰的蓝色焦点环；active 使用 `#0958d9`。
- **Text:** 顶栏操作使用透明背景、`36px` 高度和 `8px` 水平内边距，只在 hover 时出现轻灰底色。
- **Disabled / Loading:** 使用 Ant Design 的标准禁用和加载状态，不通过降低文字对比度到不可读来表达禁用。

### Chips

- **Style:** 权限码使用工作灰浅底、工作灰文字、`4px` 圆角和 `4px 8px` 内边距。
- **State:** 权限 Chip 是只读信息，不模拟按钮 hover；可操作标签必须使用独立的交互样式和焦点状态。

### Cards / Containers

- **Corner Style:** 卡片使用轻微圆角 (`8px`)，不使用大于 `16px` 的业务卡片圆角。
- **Background:** 内容表面保持白色；图标容器可使用秩序蓝浅层，但不铺满整张卡片。
- **Shadow Strategy:** 静止状态无阴影；只有明确可点击的卡片允许在 hover 时使用组件库的轻量反馈。
- **Border:** 使用轻分隔线 (`1px solid #f0f0f0`) 或不设边界，禁止边界与宽大阴影同时出现。
- **Internal Padding:** 紧凑卡片使用 `12px`，标准内容容器使用 `16px` 或 `24px`。

### Inputs / Fields

- **Style:** 全局使用 Ant Design `filled` 变体，浅灰填充、`6px` 圆角、默认高度 `32px`。
- **Focus:** 聚焦后边界与焦点环使用秩序蓝，文字和输入值保持主墨色。
- **Error / Disabled:** 错误使用标准错误红并附带文字说明；禁用态保持可辨识标签，不只依赖颜色。

### Navigation

- **Style:** 使用 ProLayout 的浅色混合导航；左侧菜单由当前 URL 派生，顶部操作负责 WorkspaceScope、账户和全局工具。
- **Active:** 当前菜单使用秩序蓝文字和浅蓝背景，hover 仅提供轻量灰色反馈。
- **Responsive:** 窄屏折叠侧栏并保留图标与可访问名称；不得通过缩放字体适配视口。

### Workspace Switch

- 顶栏 WorkspaceScope 切换使用与相邻操作一致的图标按钮；下拉菜单并列显示 Platform 与可进入的 Organization，并标记当前项。
- Platform 与不同 Organization 不能同时运行。切换使用整页导航，以卸载旧 Scope 的组件、请求和内存状态；每个 Scope 的 App 标签快照独立恢复。

## 6. Do's and Don'ts

### Do:

- **Do** 让当前 WorkspaceScope 可核对，并让 URL、Sidebar、权限、Skill 与请求 Header 同步变化。
- **Do** 使用 `4/8/12/16/24/32px` 间距和 `4/6/8px` 圆角层级维持紧凑、可预测的节奏。
- **Do** 将秩序蓝 (`#1677ff`) 限制在主操作、选中态和关键状态，并使用工作灰承担普通信息层级。
- **Do** 为按钮、输入、菜单和可点击卡片提供 default、hover、focus、active、disabled 与 loading 状态。
- **Do** 尊重 `prefers-reduced-motion`；常规状态过渡保持在 `100–200ms`，不编排页面入场动画。

### Don't:

- **Don't** 采用营销官网式的大幅 Hero、口号和装饰性卡片。
- **Don't** 堆叠术语和无层次的高密度状态来制造技术控制台感。
- **Don't** 使用高饱和颜色、夸张动效或游戏化反馈来营造消费娱乐产品感。
- **Don't** 嵌套卡片，或在同一表面同时使用 `1px` 边界和模糊半径大于 `8px` 的装饰阴影。
- **Don't** 用颜色作为权限、错误或选中状态的唯一表达方式。
- **Don't** 在按钮、标签和数据中使用展示字体、负字距或全大写追踪字。
