# AI / pAI 架构文档

> 状态：核心 Agent / Workflow 已建立，尚未接入产品 API
>
> 最近更新：2026-07-29（Asia/Hong_Kong）

## 1. 文档目的

本目录用于收敛 pAI 通用审查助手后续可能涉及的模型调用、Agent、知识库、文件处理、
会话持久化和长任务编排。当前不保留 Mastra 验证端点，也不替换现有聊天接口；后端
只有未注册到 HTTP 的研究介绍 Agent / Workflow 核心。

## 2. 当前事实

当前已经存在的最小链路：

```text
Ant Design X 会话页面
→ 前端 DeepSeekChatProvider
→ POST /api/pai/chat/completions
→ Express Bearer Token 鉴权
→ DeepSeek Chat Completions
→ DeepSeek SSE 原样透传
→ 前端拆分 reasoning 与 content
```

相关实现：

- 前端页面：`src/pages/workspace/app/platform-assistant/index.tsx`
- 前端 Provider：`src/pages/workspace/app/platform-assistant/provider.ts`
- 前端本地会话：`src/pages/workspace/app/platform-assistant/storage.ts`
- 后端实验实现：`.worktrees/auth-backend/server/src/routes/pai.ts`

当前尚未具备：

- 后端会话和消息持久化
- Knowledge Base 检索和引用
- 文件上传、解析与权限绑定
- Agent Tool
- PPT 等后台生成任务
- 自有的统一 AI 流式事件协议

当前已建立但尚未接入产品链路：

```text
researchPurpose + interestDirections + parsed materials
→ prepare-research-context
→ research-introduction-agent
→ introduction + sources
```

- Provider：`.worktrees/auth-backend/server/src/ai/providers/deepSeek.ts`
- Agent：`.worktrees/auth-backend/server/src/ai/agents/researchIntroductionAgent.ts`
- Workflow：`.worktrees/auth-backend/server/src/ai/workflows/researchIntroductionWorkflow.ts`
- Materials：`.worktrees/auth-backend/server/src/ai/materials/`
- Service：`.worktrees/auth-backend/server/src/ai/services/researchIntroductionService.ts`
- 模块入口：`.worktrees/auth-backend/server/src/ai/index.ts`

2026-07-29 完成过一次临时实验验证：

```text
固定验证 Prompt
→ 临时 Mastra Agent
→ AI SDK DeepSeek Provider
→ deepseek-v4-flash
→ MASTRA_OK
```

验证代码、路由、Schema 和测试随后按要求删除，不属于当前系统能力。该历史结果只说明
基本非流式模型调用曾经兼容；流式 reasoning、Tool、Memory、RAG 和 PPT 均未实现或
验证。当前本地 Storage + Service + Workflow 已使用临时测试资料贯通，并能读取三份
本地文章；测试中仍使用模拟 Agent，尚未接入产品 API，也没有执行真实模型调用。

## 3. 文档导航

| 文档 | 作用 | 是否为已确认方案 |
| --- | --- | --- |
| [Mastra 候选接入方案](./mastra-integration.md) | 记录 Mastra 能放在哪一层、如何渐进接入以及系统边界 | 否 |
| [需求与架构待确认清单](./requirements-checklist.md) | 在开发前确认产品、数据、安全、接口和运维问题 | 否 |
| [文章资料存储规范](./article-storage.md) | 当前少量文章的原文件、Markdown 和元数据格式 | 部分确认 |

## 4. 文档状态规则

文档中的内容使用以下标记：

- **当前事实**：代码中已经存在并可验证。
- **候选方案**：用于评审，不代表已经决定实施。
- **已确认决策**：完成评审后才能进入开发计划。
- **暂缓**：当前需求不需要，不提前实现。

正式确认采用 Mastra 后，再补充 Architecture Decision Record；在此之前不建立“已采用
Mastra”的结论，也不生成对应生产代码。

## 5. 外部参考

- [Mastra 文档](https://mastra.ai/docs)
- [Mastra Agents](https://mastra.ai/docs/agents/overview)
- [Mastra Workflows](https://mastra.ai/docs/workflows/overview)
- [Mastra RAG](https://mastra.ai/docs/rag/overview)
- [AI SDK DeepSeek Provider](https://ai-sdk.dev/providers/ai-sdk-providers/deepseek)
