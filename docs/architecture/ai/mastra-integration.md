# Mastra 候选接入方案

> 状态：核心 Agent / Workflow 已建立；未批准接入产品 API
>
> 前提：pAI 的具体产品需求、持久化范围和知识库边界尚未确认
>
> 最近更新：2026-07-29（Asia/Hong_Kong）

## 1. 结论摘要

Mastra 可以作为现有 Express 后端内部的 **AI 编排层**，但不替代 Express 路由、JWT
认证、Organization 权限、业务数据库、对象存储或任务队列。

现有产品仍使用单模型流式聊天。后端已建立一个未注册到 HTTP 的研究介绍 Agent 和
Workflow，用于固定代码边界；它不读取文件、不联网、不持久化，也不影响现有链路。

## 2. 当前链路

```text
前端
  Ant Design X
    → DeepSeekChatProvider
    → localStorage 会话

后端
  Express /api/pai/chat/completions
    → Bearer Token 鉴权
    → Zod 请求校验
    → DeepSeek 请求
    → 上游 SSE 原样透传
```

当前后端路由同时承担了模型参数、上游调用、流验证和响应透传。对于单模型聊天，这种
实现足够直接；当工具、知识库或多个工作流出现后，再拆出 Service 和编排层。

## 3. 候选目标边界

```text
Ant Design X
    ↓ 项目自有 API / SSE
Express Route
    ↓ 身份、Organization、权限和请求校验
PaiChatService
    ↓
AiOrchestrator
    ├── Mastra Agent（开放式任务）
    ├── Mastra Workflow（确定性多步骤任务）
    ├── Knowledge Tool
    ├── File Tool
    └── Presentation Tool
          ↓
DeepSeek / Vector Store / Object Storage / Job Queue
```

### 3.1 各层职责

| 层 | 负责 | 不负责 |
| --- | --- | --- |
| Express Route | HTTP、鉴权、限流、请求校验、流式响应 | Agent 决策和知识检索 |
| PaiChatService | 会话业务规则、授权上下文、统一事件转换 | 具体模型协议 |
| Mastra | Agent 循环、Tool 调用、Workflow、Memory、Trace | 用户身份和租户授权事实 |
| Tool | 调用受控的业务 Service | 自行选择 Organization 或绕过权限 |
| Repository | MySQL 查询和持久化 | Prompt 和 Agent 编排 |
| Job Queue | 文件解析、PPT 生成等可靠后台执行 | 在线聊天 Token 流 |

## 4. 后端 AI 目录

当前目录和核心文件：

```text
server/src/
└── ai/
    ├── README.md
    ├── index.ts
    ├── agents/
    │   └── researchIntroductionAgent.ts
    ├── providers/
    │   └── deepSeek.ts
    ├── tools/
    └── workflows/
        └── researchIntroductionWorkflow.ts
```

使用 `ai/` 而不是让整个后端都依赖 `mastra/` 命名，可以避免业务架构绑定单一框架。
Mastra 被限制在 AI 基础设施内部，Route 和业务 Service 尚未暴露框架类型。Workflow
只接受已经授权和解析完成的材料，不负责文件路径、数据库或 Organization 权限。

## 5. DeepSeek 接入

候选实现通过 `@ai-sdk/deepseek` 创建 DeepSeek Provider，再注入 Mastra Agent：

```ts
const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});

const reviewAssistant = new Agent({
  id: 'review-assistant',
  name: '通用审查助手',
  instructions: '待产品需求确认后定义',
  model: deepseek(process.env.DEEPSEEK_MODEL ?? 'deepseek-chat'),
});
```

2026-07-29 已确认当前 `deepseek-v4-flash` 可以通过 Mastra Agent 和 AI SDK DeepSeek
Provider 完成一次真实非流式生成。`reasoning_content`、Tool Calling 和流式中断仍未
验证；现有直接调用实现不得删除。

## 6. 权限与租户边界

Mastra 和模型只能接收后端已经授权的上下文，例如：

```ts
interface AiRequestContext {
  userId: string;
  organizationId?: string;
  allowedKnowledgeBaseIds: string[];
  allowedFileIds: string[];
}
```

必须遵守：

1. `userId` 和 Organization Scope 只能来自服务端认证结果，不能取自模型参数。
2. Tool 的查询必须再次携带 Scope 条件，不能只依赖 Prompt 告诉模型“不要越权”。
3. 模型不能直接执行任意 SQL、访问任意文件路径或选择其他 Organization。
4. 检索结果和生成产物必须保留授权主体、来源和 Trace ID。
5. 写操作或外部副作用需要单独的权限检查；是否增加人工确认尚待决定。

## 7. 前端事件边界

即使 Mastra 提供流式事件，前端也不应直接依赖 Mastra 的原生事件格式。候选项目协议：

```text
status     执行状态
reasoning  思考内容
content    最终回答增量
sources    知识库或文件引用
artifact   PPT、报告等生成产物
done       正常结束
error      可展示的标准错误
```

事件名称、数据结构以及是否继续兼容 DeepSeek 原生 SSE 均未确认。确认后应先进入 OpenAPI
或独立的流式协议文档，再修改前后端。

## 8. 分阶段接入建议

### 阶段 0：文档与需求确认（已完成文档骨架）

- 不改现有聊天接口。
- 确认 `requirements-checklist.md` 中的关键问题。

### 阶段 1：隔离验证（已完成并清理临时代码）

- 已使用现有 DeepSeek Key 和模型完成真实非流式调用。
- 临时 Agent、验证路由、请求 Schema 和测试已删除。
- 流式、reasoning 和中断验证尚未开始。
- 不接数据库，不替换现有生产链路。

基本验证结果：

```text
输入固定验证 Prompt
→ Mastra Agent
→ deepseek-v4-flash
→ MASTRA_OK
```

本阶段完整退出仍需在未来需要流式接入时补充 reasoning 和取消请求测试。

### 阶段 2：只读能力试点

- 已建立研究介绍 Agent / Workflow 核心，但尚未接 API 或真实资料。
- 选择一个只读能力，例如已授权的知识库搜索 Tool。
- Route 继续使用现有 JWT 和权限中间件。
- 后端把 Mastra 流转换成项目自有 SSE。
- 保留快速回退到直接 DeepSeek Provider 的路径。

退出条件：无跨 Organization 数据泄漏，流式中断、错误处理和 Trace 可验证。

### 阶段 3：需求驱动扩展

根据已确认需求再选择：

- Memory：后端会话和长期记忆。
- RAG：文档切片、Embedding、检索和引用。
- Workflow：文件处理、报告或 PPT 生成。
- Evals / Observability：质量基线和线上追踪。

不得为了“框架已经支持”而一次性启用全部能力。

## 9. 暂不决定

- 是否正式采用 Mastra。
- Mastra 与 Express 同进程还是独立服务。
- 会话使用 Mastra Memory、业务表，还是两者组合。
- 向量数据库类型和 Embedding 模型。
- 文件存储、解析器和任务队列。
- PPT 生成方式。
- Agent 是否允许写操作。
- 多 Agent、MCP、长期记忆和人工审批。
- 前端最终 SSE 事件协议。

以上项目在需求确认前不进入实现。

## 10. 最小验证标准

后续扩大技术验证时，至少继续检查：

- 当前 Node.js、TypeScript 和构建工具兼容。
- 当前自定义模型能够完成流式输出。
- reasoning 和 content 可以稳定分离，结束状态正确。
- 客户端取消后能中止上游请求。
- Tool 输入经过 Zod 校验。
- Tool 无法访问未经授权的 Organization、知识库和文件。
- 错误能够转换成现有 `ApiError`，不泄露 API Key 或上游响应细节。
- 不修改前端公开接口即可回退到原有 DeepSeek 链路。
