# 架构文档索引

> 状态：持续维护
>
> 最近更新：2026-09-07（Asia/Taipei）

本目录记录跨页面、跨服务的系统边界、核心链路和架构决策。路线图描述“什么时候做”，
本目录描述“系统如何组织以及为什么这样组织”。

## AI / pAI

- [AI 架构索引](./ai/README.md)
- [Mastra 接入架构](./ai/mastra-integration.md)
- [AI 需求与架构待确认清单](./ai/requirements-checklist.md)
- [AI 文章资料存储规范](./ai/article-storage.md)

Mastra 已作为 Legacy Express 后端内部的 AI 编排层接入；会话、Run、消息和来源已由 MySQL
持久化。RAG 和向量索引仍是候选规划，具体状态见 AI 架构索引。

## 认证与 Workspace

- [应用授权与渲染](../workspace-app-access.md)：Legacy / XOne 的应用授权来源与前端模型。
- [认证与密码重置](../auth-login-password-reset-flow.md)：Legacy 认证与密码重置说明。
- [登录到首页链路](./login-to-home-flow.md)：既有 Legacy 链路图与证据附件。

登录链路文档和图仍有旧函数调用描述，尚未完整覆盖 AuthSession / XOne 分支。
当前入口以 `src/services/auth-session/index.ts`、`src/services/auth-backends/` 和
`src/pages/user/login/index.tsx` 为准。
