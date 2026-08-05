# Mastra 接入架构

> 状态：统一 pAI Agent 与项目 SSE 基线已实现
>
> 最近更新：2026-08-04（Asia/Hong_Kong）

## 1. 结论

Mastra 是现有 Express 后端内部的 AI 编排层。它负责 Agent 循环、Tool 调用和模型流，
不替代 Express 路由、JWT 认证、Organization 权限、业务数据库、对象存储或任务队列。

普通聊天和联网搜索共用一个 pAI Agent。Route 按 `webSearchEnabled` 为单次请求开放或关闭
Web Search Tool，避免维护两套 Prompt、模型配置和流式适配。

## 2. 当前链路

```text
Ant Design X
→ PaiChatProvider
→ POST /api/pai/chat/completions
→ Express 鉴权与请求校验
→ 可选知识上下文
→ PaiAgentService
→ pAI Agent
   ├── activeTools: [] | [webSearchTool]
   ├── maxSteps: 3
   └── Mastra Model Router → DeepSeek
→ 项目 SSE
→ PaiChatProvider 合并消息
```

浏览器提交完整消息历史，因此当前不启用 Mastra Memory。后续如果增加服务端会话、跨设备
恢复或长期记忆，应先确定数据保留、租户隔离和删除策略，再决定 Memory 与业务消息表的关系。
PaiAgentService 在每次请求时读取当前日期，并将其和联网开关交给 Agent；客户端协议只
接受 `user` / `assistant`，不能提交 `system` 消息覆盖运行时约束。

## 3. 各层职责

| 层 | 负责 | 不负责 |
| --- | --- | --- |
| Express Route | HTTP、鉴权、请求校验、SSE 输出 | Agent 决策和 Tool 循环 |
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

运行时读取 `DEEPSEEK_API_KEY`。Route 仍先检查配置并返回项目标准错误，但不会把 Key、
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

前端只消费本站事件：

```text
event: reasoning-delta   data: { "text": "..." }
event: text-delta        data: { "text": "..." }
event: sources           data: { "sources": [...] }
event: done              data: {}
```

`sources` 可同时包含 `knowledge` 与 `web`。前端在完成回答后，只展示最终可见答案实际引用
的来源。Mastra 或 DeepSeek 的原生事件发生变化时，只需修改后端适配层。

## 7. 权限边界

1. 用户和 Organization Scope 只能来自服务端认证结果。
2. Tool 的数据查询必须再次携带并验证 Scope，不能只依赖 Prompt。
3. 模型不能执行任意 SQL、访问任意文件路径或切换 Organization。
4. 写操作和外部副作用需要独立权限检查与明确的用户确认策略。
5. 错误必须转换为项目错误，不泄露 API Key 或上游响应详情。

## 8. 后续扩展条件

- Memory：需要服务端会话或长期记忆需求，并先确认保留与删除策略。
- RAG：需要资料规模超过当前全量上下文方案，并确定 Embedding、检索质量和权限过滤。
- Workflow / Job Queue：用于文件解析、报告或 PPT 等可重试的长任务。
- 多 Agent：只有单 Agent 加受控 Tool 无法满足已验证场景时才引入。
- Observability / Evals：上线前补齐延迟、错误率、Token、Tool 质量与引用准确性基线。
