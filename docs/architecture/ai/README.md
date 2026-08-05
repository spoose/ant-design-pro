# AI / pAI 架构文档

> 状态：统一 pAI Agent 已接入产品 API
>
> 最近更新：2026-08-04（Asia/Hong_Kong）

## 1. 文档目的

本目录记录 pAI 的模型调用、Agent、知识资料、流式协议和后续能力边界。Mastra 只作为
现有 Express 后端内部的 AI 编排层，不替代 HTTP、认证、Organization 权限或业务存储。

## 2. 当前事实

当前产品链路：

```text
Ant Design X 会话页面
→ 前端 PaiChatProvider（提交完整会话历史）
→ POST /api/pai/chat/completions
→ Express Bearer Token 鉴权与 Zod 校验
→ 可选本地知识上下文
→ PaiAgentService
→ Mastra pAI Agent
   ├── Mastra Model Router → DeepSeek
   └── 可选 webSearchTool（Firecrawl）
→ 项目 SSE：reasoning-delta / text-delta / sources / done
→ 前端合并推理、回答和来源
```

已实现：

- 统一 pAI Agent 同时处理普通聊天和联网搜索。
- `webSearchEnabled` 控制当前请求是否开放 `webSearchTool`。
- Agent `maxSteps` 为 3；搜索最多两次，只允许一次纠错重试。
- `knowledgeEnabled` 将服务端发现的合法本地资料作为系统上下文注入。
- 后端把 Mastra 事件转换为项目自有 SSE，前端不依赖框架或模型原生协议。
- DeepSeek 使用 Mastra Model Router 模型字符串和 `DEEPSEEK_API_KEY`，不维护自定义 Provider。
- 浏览器随每次请求提交完整历史，当前不重复启用 Mastra Memory。

主要实现：

- 前端 Provider：`src/pages/workspace/app/platform-assistant/provider.ts`
- 后端路由：`.worktrees/auth-backend/server/src/routes/pai.ts`
- pAI Agent：`.worktrees/auth-backend/server/src/ai/agents/paiAgent.ts`
- Agent 事件适配：`.worktrees/auth-backend/server/src/ai/services/paiAgentService.ts`
- 模型 ID：`.worktrees/auth-backend/server/src/ai/models/deepSeek.ts`
- Web Tool：`.worktrees/auth-backend/server/src/ai/tools/webSearchTool.ts`

当前尚未具备：

- 后端会话和消息持久化
- RAG、向量检索和 Top-K 引用
- 文件上传、解析与权限绑定
- PPT 等可靠后台生成任务
- 完整的线上 Trace、成本审计和质量评测

## 3. 文档导航

| 文档 | 作用 | 状态 |
| --- | --- | --- |
| [Mastra 接入架构](./mastra-integration.md) | 当前边界、模型配置、Agent 循环与 SSE 协议 | 已实现基线 |
| [后端会话与向量存储规划](./backend-conversation-vector-storage.md) | MySQL 会话事实源、前端迁移和 Qdrant RAG 分阶段设计 | 候选实施基线 |
| [需求与架构待确认清单](./requirements-checklist.md) | 记录后续产品、数据、安全和运维决策 | 持续维护 |
| [文章资料存储规范](./article-storage.md) | 少量本地文章的原文件、Markdown 和元数据格式 | 当前使用 |

## 4. 设计边界

- Route 负责 HTTP、鉴权、请求校验和 SSE，不负责 Agent 决策。
- Agent 负责模型与 Tool 循环，不决定用户或 Organization 权限。
- Tool 只调用受控 Service，不接受任意文件路径、SQL 或租户范围。
- 写操作、Memory、RAG、多 Agent 和后台产物必须由明确需求驱动后再引入。

## 5. 外部参考

- [Mastra Agents](https://mastra.ai/reference/agents)
- [Mastra DeepSeek Provider](https://mastra.ai/models/providers/deepseek)
- [Mastra Workflows](https://mastra.ai/docs/workflows/overview)
- [Mastra RAG](https://mastra.ai/docs/rag/overview)
