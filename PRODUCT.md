# Product

## Register

product

## Platform

web

## Terminology

- **App / 应用**：工作台中的普通业务应用，包括首页应用卡片、快捷入口、侧栏入口和应用标签；应用代码称为 App Code，授权字段使用 `projectAppCodes` / `appCodes`。
- **Agent Skill**：供 Agent 使用的技能，不作为普通业务应用的同义词。开发工具中的 Codex / Claude Code Skills 也不属于工作台应用。
- 应用授权与当前后端差异见 [Workspace 应用授权与渲染](./docs/workspace-app-access.md)。

## Users

主要用户是企业内部业务人员、组织管理员与平台管理员。他们需要在 Platform 或一个 Organization 工作区中使用被授权的功能与应用。

## Product Purpose

产品为 Platform 与多个 Organization 提供统一登录和工作入口。用户选择 WorkspaceScope 后，界面只呈现该 Scope 允许的功能与应用；Organization 首页和每个 App 拥有与当前 URL 一致的侧栏。

## Positioning

一个账号、一个工作台、按当前 WorkspaceScope 精确授权。Platform 与不同 Organization 不同时运行；切换 Scope 后整页加载，App 标签只在当前 Scope 中共存。

## Brand Personality

产品性格是专业、高效、可信。语气克制而直接，优先传达清晰的状态与操作结果，让高频使用保持稳定、可预期。


## Design Principles

1. 当前 URL 中的 WorkspaceScope 是信息与操作的共同依据，标题、侧栏、权限、应用和请求 Header 必须同步变化。
2. 只呈现用户当前可以理解和执行的授权能力，让访问范围清晰可核对。
3. 优先支持高频工作流；Organization 切换直接进入目标首页，当前 Organization 内的 App 通过顶栏标签快速切换。
4. 通过明确、一致、可预期的状态反馈建立信任。

## Accessibility & Inclusion

以 WCAG 2.2 AA 为基线。核心流程需要支持键盘操作与清晰的焦点状态，文本和控件保持足够对比度，状态表达不只依赖颜色，并尊重用户的减少动态效果设置。
