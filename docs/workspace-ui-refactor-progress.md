# Workspace UI 重构进度

> 状态快照：2026-08-19（Asia/Hong_Kong）

## 当前基线

- 当前分支：`codex/workspace-ui-refactor`
- 基线分支：`codex/gitee-release`
- 基线提交：`d717501e feat(workspace): snapshot the light-card workbench homepage`
- 创建分支时，`codex/gitee-release` 已与 GitHub `origin/codex/gitee-release` 同步。
- 新分支尚未设置远端跟踪分支。

最近完成的关键提交：

1. `d1dc6d8a feat(workspace): add scoped knowledge uploads`
2. `d717501e feat(workspace): snapshot the light-card workbench homepage`

## 分支情况

| 本地分支 | 远端状态 |
| --- | --- |
| `codex/workspace-ui-refactor` | 当前 UI 重构分支，尚未推送 |
| `codex/gitee-release` | 与 `origin/codex/gitee-release` 同步 |
| `auth-rbac` | 与 `origin/auth-rbac` 同步 |
| `feature-tabs` | 与 `origin/feature-tabs` 同步 |
| `master` | 与 `origin/master` 同步 |
| `select-department-page` | 与 `origin/select-department-page` 同步 |
| `codex/auth-frontend` | 比 `origin/codex/auth-frontend` 领先 2 个提交 |
| `codex/auth-backend-rbac` | 仅本地，无跟踪远端 |
| `codex/experimental-auth-server` | 仅本地，位于独立 worktree |
| `codex/login-split-layout-test` | 仅本地，位于临时 worktree |

## 当前产品进度

- Workspace 已具备 Platform / Organization 范围、应用导航和标签页结构。
- 资源页支持将个人或组织 TXT / Markdown 资料写入 MySQL。
- MySQL 上传资料尚未接入 Agent；Agent 仍读取旧的本地资料目录。
- Platform 首页已有浅色卡片工作台快照，可作为本次 UI 重构的视觉基线。

## 本次重构边界

1. 先统一 Workspace 外壳：顶栏、侧栏、内容表面、圆角和响应式结构。
2. 再统一设计 Token 与共享组件，避免页面逐个覆盖 ProLayout 样式。
3. 分批迁移 Platform、Organization 和各 Workspace App 页面。
4. 保持路由、权限、请求 Header、知识上传和 Agent 业务链路不变。
5. 每一批迁移都保留 TypeScript、Vitest、Biome 和 Ant Design 检查。

## 未跟踪内容

以下内容在创建分支前已经存在，不属于本次分支创建操作：

- `.cursor/`：Ponytail 的 Cursor 规则与 Skill，需决定提交、忽略或删除。
- `docs/architecture/`：未跟踪的架构文档，其中包含应排除的 `.DS_Store`。
- `public/jushu-*.png` / `public/jushu-*.webp`：14 张未引用的实验图片。

提交前不要直接使用未经检查的 `git add -A`，避免把上述内容带入 UI 重构提交。
