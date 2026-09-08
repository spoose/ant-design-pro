# pAI 后端会话实现与向量存储规划

> 状态：Legacy 会话持久化已实现；知识摄取与向量检索仍为候选规划
>
> 最近核对：2026-09-07（Asia/Taipei）

## 1. 当前实现边界

MySQL 已保存会话、Run、用户/助手正文和来源。历史由后端组装，不启用 Mastra Memory。
以下事实来自 `server/migrations/005_pai_conversations.sql`、
`server/src/repositories/paiConversationRepository.ts`、`server/src/services/paiConversationService.ts`
和 `server/src/routes/paiConversations.ts`。后文知识表、Qdrant 和索引任务不代表已实施。

当前 `ai-assistant` 页面在 Legacy 模式使用此链路，XOne 模式禁用该 pAI API。

## 2. MySQL 会话模型（已实现）

| 表 | 当前结构与职责 |
| --- | --- |
| `pai_conversations` | UUID、owner、`platform` / `organization` Scope、组织 ID、最长 120 字符的标题和创建/更新时间 |
| `pai_runs` | Conversation 外键、`turn_no`、`idempotency_key`、状态、能力开关、模型标识、trace、错误和时间；Token 用量字段已预留，不表示已完成成本审计 |
| `pai_messages` | 直接关联 `run_id`；每个 Run 至多一条 user 和一条 assistant；保存状态、正文和时间 |
| `pai_message_sources` | Assistant 消息下的来源快照，包含来源 ID/类型、标题、URL、摘要、日期与顺序 |

当前约束和行为：

- Platform 会话没有组织 ID；Organization 会话必须有组织 ID。组织会话也受 owner 限制，不是组织共享会话。
- Run 的 `(conversation_id, turn_no)` 和 `(conversation_id, idempotency_key)` 唯一；消息的 `(run_id, role)` 唯一。
- 开始 Run 时锁定会话；存在 pending/streaming Run 时拒绝并发生成。终态幂等请求可重放保存的正文和来源。
- 模型上下文取最近 50 个已完成轮次，再追加本轮问题；失败/中止轮次保留供查看，不进入下一轮模型历史。
- 当前没有按 Token 预算截断。reasoning 仅通过 SSE 透传，数据库没有 `reasoning_content` 字段。
- 流式生成不占用一个贯穿全程的数据库事务；正文有增量且距上次保存至少一秒时写快照，结束时保存正文、来源和终态。
- 客户端断开会触发上游取消；已捕获的取消/失败保存为 aborted/failed。当前没有后台定时任务保证进程崩溃后的悬挂 Run 自动收敛。
- 删除会话是硬删除，外键级联删除 Run、消息和来源；没有软删除、归档状态或保留期清理任务。
- 当前没有旧规划中的 `active_run_id`、消息 `sequence_no`、`parent_message_id` 或来源 `is_cited` 字段。

## 3. API 与前端（已实现）

```text
POST   /api/pai/conversations
GET    /api/pai/conversations?scopeType=platform&limit=30
GET    /api/pai/conversations/:conversationId
PATCH  /api/pai/conversations/:conversationId
DELETE /api/pai/conversations/:conversationId
POST   /api/pai/conversations/:conversationId/runs → SSE
```

Organization 列表使用 `scopeType=organization` 并提供 `organizationId`。
列表 limit 默认 30、最大 100；当前没有 cursor 分页，单会话接口返回完整历史。

发送本轮消息：

```json
{
  "idempotencyKey": "00000000-0000-4000-8000-000000000001",
  "content": "用户本次问题",
  "knowledgeEnabled": true,
  "webSearchEnabled": false
}
```

客户端不能提交历史、模型名或 System Prompt。SSE 事件包括 `run`、`reasoning-delta`、
`text-delta`、`sources`、`done` 和 `error`，详见 [Legacy pAI API](./legacy-pai-chat-api.md)。

前端入口为 `src/pages/workspace/app/ai-assistant/index.tsx` 和同目录 `provider.ts`。
现有 `pai:v1:*` localStorage 快照按当前实现直接清除，没有一次性导入 API 或导入幂等机制。
页面加载会话和历史以服务端结果为准，不应继续按旧导入规划开发。

## 4. 向量数据库候选规划（未实施）

### 原规划候选：Qdrant

| 方案 | 结论 |
| --- | --- |
| MySQL 8.x | 继续作为业务事实源；不承担 ANN 向量检索 |
| PostgreSQL + pgvector | 能工作且 Mastra 支持，但会引入第二个关系型数据库及两套迁移/备份职责 |
| Qdrant | 推荐；专门承担可重建向量索引，支持 Payload 过滤和多租户分区 |
| Pinecone 等托管服务 | 部署条件要求免运维时再评估，应用数据模型不依赖它 |

候选方案拟在 Mastra 侧通过 `@mastra/rag` 的查询 Tool 和 `@mastra/vector-qdrant` 适配；业务 Service 仍负责
权限过滤和 MySQL 回源，不让 Agent 直接拼接 tenant 过滤条件。

### 4.1 Collection 策略（候选）

- **每个 Embedding 模型/维度一个 Collection**，不按用户或 Organization 建 Collection。
- 示例：`pai_knowledge_bge_m3_1024_v1`。
- Point ID 使用 `knowledge_chunk.id` UUID。
- 相似度首期使用 cosine；更换模型时创建新版本 Collection 后切换别名，不原地混写维度。

Qdrant Payload 只保存检索过滤所需字段：

```json
{
  "tenant_key": "organization:<uuid>",
  "knowledge_base_id": "uuid",
  "document_id": "uuid",
  "chunk_id": "uuid",
  "document_version": 3,
  "language": "zh-CN",
  "active": true
}
```

必须为 `tenant_key`、`knowledge_base_id`、`document_id`、`active` 创建 Payload Index。每次查询
至少包含服务端生成的 `tenant_key` 和 `active=true`；Agent 输入不能覆盖这两个条件。

## 5. MySQL 知识与索引任务（未实施）

向量检索启用前，增加以下业务表：

- `pai_knowledge_bases`：名称、Scope、Organization、状态。
- `pai_knowledge_documents`：标题、对象存储 Key、checksum、版本、解析状态和权限元数据。
- `pai_knowledge_chunks`：文档版本、ordinal、正文、token count、content hash、索引状态。
- `pai_vector_index_jobs`：chunk、目标 Collection、Embedding 模型、操作类型、重试次数和错误。

写入流程使用 Outbox 思路：MySQL 事务内更新文档/切片并创建 index job；Worker 在事务外生成
Embedding 并 upsert/delete Qdrant，成功后回写状态。Qdrant 不可用时知识检索降级为不可用，
但聊天、会话读取和 MySQL 数据不能受影响。

在线检索流程：

```text
用户问题
→ 后端确定 user / organization / knowledgeBase Scope
→ 生成 query embedding
→ Qdrant 带 tenant payload filter 查询 Top-K chunk IDs
→ MySQL 按 chunk IDs 再次验证 active/version/Scope 并读取正文
→ 可选 rerank
→ Knowledge Tool 返回结构化片段和 sourceId
→ Agent 生成带引用回答
```

## 6. 后续实施范围

以下工作仍是规划，需按实际需求单独确认：

- 知识元数据和摄取：知识库/文档/切片/索引任务表、对象存储、解析与版本重建。
- RAG：Embedding、Top-K、权限过滤、MySQL 回源、引用和检索质量评测。
- 可选长期记忆：只有明确需要跨长会话语义回忆时再评估；不默认向量化所有原始聊天。
- 会话增强：游标分页、Token 预算、进程崩溃后的 Run 恢复和保留期限，当前均不能视为已有能力。

原规划中的数据库类型、适配包和 Collection 示例仅保留为设计参考；实施前需重新核实
选型和版本，当前 `server/package.json` 未引入 Qdrant 或 RAG 适配依赖。

## 7. 仍需确认的决策

1. 是否新增组织共享会话；当前仅 owner 可见。
2. 正文及来源的保留期限、删除审计；当前采用级联硬删除。
3. 是否改变 reasoning 不落库的现状，以及相应数据策略。
4. Embedding Provider、模型、维度、部署区域和成本要求。
5. 向量库最终选型、托管方式、备份和恢复要求。
6. RAG Top-K、chunk size、overlap 和引用准确率的验收数据集。
