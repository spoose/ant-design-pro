# Mastra 接入架构

> 状态：统一 pAI Agent 与项目 SSE 基线已实现
>
> 最近更新：2026-09-07（Asia/Taipei）

## 1. 结论

Mastra 是现有 Express 后端内部的 AI 编排层。它负责 Agent 循环、Tool 调用和模型流，
不替代 Express 路由、JWT 认证、Organization 权限、业务数据库、对象存储或任务队列。

普通聊天和联网搜索共用一个 pAI Agent。服务层按 `webSearchEnabled` 为单次请求开放或关闭
Web Search Tool，避免维护两套 Prompt、模型配置和流式适配。

## 2. 当前链路

```text
Ant Design X（Legacy pAI）
→ PaiChatProvider
→ POST /api/pai/conversations/:conversationId/runs
→ Express 鉴权与请求校验
→ PaiConversationService：从 MySQL 组装最近 50 个已完成轮次
→ 可选知识上下文
→ PaiAgentService
→ pAI Agent
   ├── activeTools: [] | [webSearchTool]
   ├── maxSteps: 3
   └── Mastra Model Router → DeepSeek
→ 项目 SSE；正文快照与终态写回 MySQL
→ PaiChatProvider 合并消息
```

客户端只提交本轮 `content`、UUID `idempotencyKey` 和能力开关，会话 ID 位于 URL。
`startPaiRunSchema` 拒绝额外字段；历史、模型名和系统消息不由客户端指定。
PaiConversationService 从数据库完整历史中选择最近 50 个已完成轮次，再追加本轮问题；
当前按轮数限制，尚未按 Token 预算截断。MySQL 是会话事实源，不启用 Mastra Memory。
PaiAgentService 在每次请求时读取当前日期，并将其和联网开关交给 Agent。

实现入口：`server/src/routes/paiConversations.ts`、`server/src/services/paiConversationService.ts`、
`server/src/ai/services/paiAgentService.ts`。XOne 模式下，当前 `ai-assistant` 页面禁用该 Legacy API。

## 3. 各层职责

| 层 | 负责 | 不负责 |
| --- | --- | --- |
| Express Route | HTTP、鉴权、请求校验、SSE 输出 | Agent 决策和 Tool 循环 |
| PaiConversationService | 会话历史、知识注入、Run 生命周期与持久化协调 | Agent 工具选择 |
| PaiAgentService | 输入适配、Mastra 事件归一化、来源去重 | 用户身份与租户授权 |
| Mastra Agent | Prompt、模型流、Tool 选择与有限循环 | HTTP 和业务持久化 |
| Tool | 调用受控外部或业务能力、校验输入输出 | 自行扩大数据 Scope |
| Repository / Service | 授权后的数据访问和持久化 | Prompt 与 Agent 编排 |

## 4. DeepSeek 配置

DeepSeek 通过 Mastra Model Router 使用，不再维护 `@ai-sdk/deepseek` 自定义 Provider：

```ts
new Agent({
  model: `deepseek/${model}`,
  defaultOptions: {
    maxSteps: 3,
    providerOptions: {
      deepseek: { thinking: { type: 'enabled' } },
    },
  },
});
```

运行时读取 `DEEPSEEK_API_KEY`。会话服务先检查配置并返回项目标准错误，但不会把 Key、
模型原生响应或 Mastra 类型暴露给前端。

## 5. 窄搜索循环

pAI Agent 的搜索约束为：

1. 仅当本次请求的 `webSearchEnabled` 为真时开放 `webSearchTool`。
2. 需要最新外部事实时先搜索，不凭模型记忆伪造实时结果。
3. 最多调用搜索两次；第二次只用于修正第一次查询或补足明显缺口。
4. `maxSteps: 3` 为框架级硬上限，防止工具循环无边界增长。
5. Tool 返回结构化来源，Service 按 URL 去重并通过 `sources` 事件发送。

限制设置在 Agent 的 `defaultOptions` 和指令中；Tool 只负责单次受控搜索，不拥有循环。

## 6. 项目 SSE 协议

前端只消费项目事件：`run`、`reasoning-delta`、`text-delta`、`sources`、`done` 和 `error`。

- `run` 携带本轮标识和 `replayed`；成功完成或终态重放后，`done` 携带 `runId` 和 `status`。
- `reasoning-delta` / `text-delta` 携带 `{ text }`，`sources` 携带 `{ sources }`。
- 开流前失败返回标准 HTTP 错误；开流后失败发送 `error` 并结束连接，不能当作成功完成。
- reasoning 只透传；助手正文在有文本增量且距离上次保存至少一秒时保存快照，终态保存正文和来源。
- `sources` 可同时包含 `knowledge` 与 `web`；展示和引用处理由前端完成。

完整请求和事件结构见 [Legacy pAI API](./legacy-pai-chat-api.md)。模型原生事件变化时，
由 PaiAgentService 适配，项目协议由 Route 保持。

## 7. 权限边界

1. 用户和 Organization Scope 只能来自服务端认证结果。
2. Tool 的数据查询必须再次携带并验证 Scope，不能只依赖 Prompt。
3. 模型不能执行任意 SQL、访问任意文件路径或切换 Organization。
4. 写操作和外部副作用需要独立权限检查与明确的用户确认策略。
5. 错误必须转换为项目错误，不泄露 API Key 或上游响应详情。

## 8. 后续扩展条件

- Memory：仅在现有 MySQL 历史之外出现长期记忆需求时评估，并先确认保留与删除策略。
- RAG：需要资料规模超过当前全量上下文方案，并确定 Embedding、检索质量和权限过滤。
- Workflow / Job Queue：用于文件解析、报告或 PPT 等可重试的长任务。
- 多 Agent：只有单 Agent 加受控 Tool 无法满足已验证场景时才引入。
- Observability / Evals：上线前补齐延迟、错误率、Token、Tool 质量与引用准确性基线。
