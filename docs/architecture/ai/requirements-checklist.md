# AI 需求与架构待确认清单

> 状态：已实现基线与后续待确认项分开记录
>
> 用法：需求确认后逐项记录结论；未确认项不得被默认解释为需要开发
>
> 最近更新：2026-09-07（Asia/Taipei）

## 1. 产品范围

| 问题 | 当前状态 | 备注 |
| --- | --- | --- |
| 通用审查助手的首个真实场景是什么 | 待确认 | 先选择一个可验收的纵向切片 |
| 助手只回答问题，还是可以执行操作 | 待确认 | 写操作需要更高权限和确认机制 |
| 是否需要知识库 | 部分确认 | 当前只读本地资料全量注入；RAG 与租户 Scope 待确认 |
| 是否支持文件上传 | 待确认 | 文件类型、大小和生命周期未定 |
| 是否生成 PPT、报告或其他产物 | 待确认 | 更适合后台任务，不应阻塞聊天请求 |
| 是否需要多 Agent | 暂缓 | 当前没有足够需求证明其必要性 |

### 1.1 已有本地验证与后续工作流设想

```text
输入
  调研目的
  兴趣方向
    ↓
收集与整理资料
  当前已有资料
  后续更新资料
  相关数据
    ↓
生成与目的、兴趣方向匹配的介绍
    ↓
未来可选：生成 PPT
```

`server/scripts/runResearchIntroduction.ts` 已通过本地脚本传入调研目的、兴趣方向和来源 ID，
由 ResearchIntroductionService / Workflow 生成介绍；这不等同于已经提供产品 HTTP 入口。
资料来源、更新时间、介绍的验收标准和后续 PPT 生成仍需确认。

## 2. 会话与记忆

当前实现详见 [会话存储与后续规划](./backend-conversation-vector-storage.md)。旧 localStorage
快照直接清除，不导入；新增迁移方案需单独确认。

| 问题 | 当前状态 | 备注 |
| --- | --- | --- |
| 会话是否需要跨设备同步 | 已有后端存储基线 | Legacy 按同一用户及 Scope 读取 MySQL 会话；XOne 页面未接入此 API |
| 消息是否写入后端数据库 | 已实现 | 用户/助手正文、Run 和来源入库；长期保留期限仍待确认 |
| 是否允许模型长期记住用户偏好 | 待确认 | 需要用户可见、可修改、可删除 |
| 删除 Conversation 是否同步删除消息和 Memory | 当前级联硬删除 | Run、消息和来源随会话删除；未启用 Mastra Memory，删除审计仍待确认 |
| 是否保存 reasoning | 当前不落库 | 仅流式透传；改变此策略需单独确认 |

## 3. 知识库与文件

| 问题 | 当前状态 | 备注 |
| --- | --- | --- |
| Knowledge Base 属于 Platform 还是 Organization | 待确认 | 可以支持两种 Scope，但不能隐式混用 |
| 谁可以创建、更新和删除知识库 | 待确认 | 与搜索权限分开定义 |
| 检索是否必须返回引用 | 建议必须 | 便于用户核验和质量评测 |
| 支持哪些文件类型 | 待确认 | PDF、DOCX、PPTX、XLSX 需要不同解析链路 |
| 原文件和抽取文本保存在哪里 | 待确认 | 对象存储与数据库职责需分开 |
| Embedding 和向量数据库选型 | 暂缓 | 先确认数据量、语言和检索质量目标 |

## 4. 模型与 Agent

| 问题 | 当前状态 | 备注 |
| --- | --- | --- |
| 首期是否只使用 DeepSeek | 待确认 | 当前 pAI Agent 使用 DeepSeek |
| DeepSeek 模型名是否长期保留 | 待确认 | 当前通过 Mastra Model Router 配置，流式和 Tool 已验证 |
| reasoning 是否展示、默认折叠或关闭 | 部分确认 | 当前 UI 倾向默认折叠 |
| Agent 可以调用哪些 Tool | 部分确认 | 当前 pAI Agent 仅注册按请求启用的只读 Web Search Tool |
| Tool 是否允许产生外部副作用 | 建议首期禁止 | 写操作需要确认与审计 |
| 是否需要模型降级或多 Provider | 暂缓 | 有可靠性或成本目标后再设计 |

## 5. API 与前端

| 问题 | 当前状态 | 备注 |
| --- | --- | --- |
| 当前 Legacy 对话入口 | 已迁移至 Conversation / Run API | `POST /api/pai/conversations/:conversationId/runs`；旧 chat/completions 不再挂载 |
| 是否继续透传 DeepSeek 原生 SSE | 否 | 已转换为项目自有事件 |
| SSE 事件及错误协议 | 已实现 | run、reasoning-delta、text-delta、sources、done、error；完整结构见 Legacy pAI API |
| Conversation API 是否进入 OpenAPI | 待确认 | 普通 JSON CRUD 应进入 OpenAPI |
| 流式协议如何进入契约 | 已有独立文档 | 见 [Legacy pAI API](./legacy-pai-chat-api.md)，与路由实现同步维护 |
| 前端是否继续使用 Ant Design X SDK | 当前是 | 不因引入 Mastra 自动替换 |

## 6. 安全、合规与运维

| 问题 | 当前状态 | 备注 |
| --- | --- | --- |
| Prompt、消息和文件的保留期限 | 待确认 | 影响数据库、日志和备份 |
| 是否允许数据发送给第三方模型 | 待确认 | 需要产品和合规确认 |
| 是否需要敏感信息脱敏 | 待确认 | 输入、Tool 结果和日志都需考虑 |
| 用户和 Organization 限流 | 待确认 | 防止成本和资源滥用 |
| Token 用量和成本归属 | 待确认 | 可按用户、Organization、Agent 记录 |
| 失败重试和幂等性 | 聊天已有基线 | Run 使用 idempotencyKey、并发拦截与终态重放；后台产物任务策略仍待确认 |
| 监控和质量评测指标 | 待确认 | 至少覆盖延迟、错误率、Token 和引用质量 |

## 7. Mastra 采用决策

| 决策 | 当前结论 |
| --- | --- |
| 是否现在安装 Mastra | 是，作为后端内部 AI 编排层 |
| 是否让 Mastra 替代 Express | 否 |
| 是否让 Mastra 负责认证与 Organization 授权 | 否 |
| 是否允许直接向前端暴露 Mastra 原生 API | 否，使用项目自有 SSE |
| 已完成的验证 | pAI 流式、推理、只读 Web Tool、知识来源与历史消息 |
| 首个业务试点 | pAI 联网搜索，只读窄循环 |
| 是否保留直连 DeepSeek 实现作为回退 | 否，统一使用 Mastra Model Router |

## 8. 开发启动条件

Mastra 业务试点已经进入 pAI 产品链路。扩大到新能力前，需要满足：

1. 明确新增场景和可验证验收示例。
2. 明确该场景需要 Agent、Tool 还是确定性 Workflow。
3. 明确数据 Scope、最小权限和副作用策略。
4. 新事件先进入项目 SSE 契约，再修改前端 Provider。
5. 明确哪些输入、消息、来源和产物允许持久化。
6. 为新增能力补齐错误、取消、权限和回归测试。
