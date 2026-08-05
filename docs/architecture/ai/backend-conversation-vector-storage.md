# pAI 后端会话与向量存储规划

> 状态：候选实施基线；尚未创建数据库迁移、API 或向量库依赖
>
> 最近更新：2026-08-04（Asia/Hong_Kong）

## 1. 结论

1. **MySQL 是事实源**：保存会话、消息、生成运行、来源、知识文档元数据和切片正文。
2. **Qdrant 是派生检索索引**：只保存 Embedding 和最小过滤元数据，丢失后可由 MySQL 重建。
3. **聊天历史首期不用向量库**：按会话顺序从 MySQL 读取最近消息；语义回忆是后续独立需求。
4. **首期不启用 Mastra Memory**：产品 API、权限、会话列表和删除语义由业务表掌控，后端继续
   显式把有限历史传给 Agent。
5. **前端不再提交完整历史**：最终只提交 `conversationId`、本次用户消息和能力开关。
6. **不在流式期间持有数据库事务**：开始和结束各使用一次短事务，避免长事务占用连接和锁。

选择 Qdrant 的原因：现有 MySQL 8.x 架构没有通用向量类型和近邻索引；为了 pgvector 再引入
一套 PostgreSQL 会增加第二个关系型事实源。Qdrant 作为可重建索引边界更清晰，并支持按
Payload 过滤和多租户分区。

## 2. 数据边界

```text
MySQL（唯一事实源）
├── 会话与消息
├── Agent 运行状态、错误和用量
├── 回答来源与引用状态
├── 知识库、文档、版本和切片正文
└── 向量索引任务 / 同步状态

对象存储（资料原件，后续）
└── PDF / DOCX / HTML / 规范化 Markdown

Qdrant（可重建派生索引）
└── chunkId → vector + tenant/document/version payload
```

禁止把以下内容只保存在 Qdrant：会话正文、原始文件、唯一一份切片正文、权限事实或删除状态。

## 3. MySQL 会话模型

### 3.1 `pai_conversations`

| 字段 | 建议类型 | 说明 |
| --- | --- | --- |
| `id` | `CHAR(36)` | 服务端 UUID，会替代浏览器 conversation key |
| `owner_user_id` | `CHAR(36)` | 创建者和首期唯一可见用户 |
| `scope_type` | `ENUM('personal','organization')` | 数据归属范围 |
| `organization_id` | `CHAR(36) NULL` | Organization 会话必填，个人会话为空 |
| `title` | `VARCHAR(200)` | 会话标题 |
| `status` | `ENUM('active','archived','deleted')` | 生命周期 |
| `active_run_id` | `CHAR(36) NULL` | 同一会话只允许一个生成流；不作为权限事实 |
| `next_sequence` | `BIGINT UNSIGNED` | 在事务中分配消息顺序 |
| `last_message_at` | `TIMESTAMP(3) NULL` | 会话排序游标 |
| `created_at/updated_at/deleted_at` | `TIMESTAMP(3)` | 审计与软删除 |

约束和索引：

- `FOREIGN KEY owner_user_id → users(id)`。
- `FOREIGN KEY organization_id → organizations(id)`。
- `CHECK`：personal 必须没有 `organization_id`，organization 必须有。
- 列表索引：`(owner_user_id, status, last_message_at DESC, id)`。
- Organization 检索索引：`(organization_id, status, last_message_at DESC, id)`。
- 首期即使是 Organization Scope，也只允许 `owner_user_id` 访问；共享会话另行设计。

### 3.2 `pai_messages`

| 字段 | 建议类型 | 说明 |
| --- | --- | --- |
| `id` | `CHAR(36)` | 消息 UUID |
| `conversation_id` | `CHAR(36)` | 所属会话 |
| `sequence_no` | `BIGINT UNSIGNED` | 会话内严格递增 |
| `role` | `ENUM('user','assistant')` | 不持久化运行时 system Prompt |
| `status` | `ENUM('pending','streaming','completed','failed','aborted')` | 稳定恢复流状态 |
| `content` | `MEDIUMTEXT` | 用户问题或最终回答 |
| `reasoning_content` | `MEDIUMTEXT NULL` | 当前 UI 使用的折叠推理；与回答分开存储 |
| `parent_message_id` | `CHAR(36) NULL` | Assistant 指向触发它的 User 消息 |
| `created_at/completed_at` | `TIMESTAMP(3)` | 生命周期 |

关键约束：

- `UNIQUE (conversation_id, sequence_no)`。
- `INDEX (conversation_id, sequence_no DESC)`，用于游标分页和最近上下文。
- 删除会话后由外键级联删除消息；普通 UI 删除先软删除会话，保留期结束后再硬删除。
- Agent 看到的上下文由后端按 Token 预算组装，不使用浏览器传来的历史。

### 3.3 `pai_runs`

每次用户提问对应一条运行记录，用来处理幂等、流中断、模型错误和并发生成。

| 字段 | 建议类型 | 说明 |
| --- | --- | --- |
| `id` | `CHAR(36)` | Run UUID |
| `conversation_id` | `CHAR(36)` | 所属会话 |
| `user_message_id/assistant_message_id` | `CHAR(36)` | 本轮两条消息 |
| `idempotency_key` | `VARCHAR(128)` | 前端每次发送生成，防止网络重试重复写入 |
| `status` | `ENUM('streaming','completed','failed','aborted')` | 运行状态 |
| `knowledge_enabled/web_search_enabled` | `BOOLEAN` | 本轮实际能力开关 |
| `model_provider/model_name` | `VARCHAR(64/128)` | 运行时模型快照 |
| `trace_id` | `VARCHAR(128) NULL` | 与日志、SSE 错误关联 |
| `input_tokens/output_tokens` | `INT UNSIGNED NULL` | 用量 |
| `error_code` | `VARCHAR(128) NULL` | 安全错误码，不保存上游秘密 |
| `started_at/completed_at` | `TIMESTAMP(3)` | 延迟和审计 |

约束：`UNIQUE (conversation_id, idempotency_key)`。开始生成时锁定 conversation 行，写入两条
消息、run 和 `active_run_id` 后立即提交；流结束后使用第二个短事务更新内容和状态并清空
`active_run_id`。进程异常退出后，定时任务把超时 streaming run 收敛为 aborted。

### 3.4 `pai_message_sources`

| 字段 | 建议类型 | 说明 |
| --- | --- | --- |
| `message_id` | `CHAR(36)` | Assistant 消息 |
| `source_id` | `VARCHAR(100)` | 当前知识或网页来源 ID |
| `source_type` | `ENUM('knowledge','web')` | 来源类型 |
| `title/source_url/snippet` | `TEXT` | 生成时来源快照 |
| `ordinal` | `INT UNSIGNED` | 展示顺序 |
| `is_cited` | `BOOLEAN` | 最终可见回答是否实际引用 |

主键使用 `(message_id, source_id)`。候选来源和最终引用都可审计，前端只展示 `is_cited=true`。

## 4. 后端 API 目标

```text
GET    /api/pai/conversations?cursor=&limit=
POST   /api/pai/conversations
PATCH  /api/pai/conversations/:conversationId
DELETE /api/pai/conversations/:conversationId
GET    /api/pai/conversations/:conversationId/messages?before=&limit=
POST   /api/pai/conversations/:conversationId/messages   → SSE
```

发送消息的目标请求：

```json
{
  "clientMessageId": "uuid",
  "content": "用户本次问题",
  "knowledgeEnabled": true,
  "webSearchEnabled": false
}
```

后端处理顺序：

1. 从 JWT 读取 `userId`，读取并锁定会话，验证 owner 和 Organization Membership。
2. 使用 `clientMessageId` 做幂等；同一会话存在 active run 时返回 `409`。
3. 短事务写入 User 消息、Assistant 占位消息和 Run。
4. 按 `sequence_no` 读取最近消息，并按 Token 预算截断。
5. 调用 pAI Agent；SSE 协议继续使用 `reasoning-delta/text-delta/sources/done`。
6. 在内存中累计本轮文本和来源，不在每个 Token 上写 MySQL。
7. 完成、失败或取消时，用第二个短事务收口消息和 Run。

读取和修改必须始终包含服务端 Scope 条件；不能先按 ID 读取，再只依赖前端判断所有权。

## 5. 从 localStorage 迁移

后端 API 上线后，前端分两步切换：

1. 新会话直接写后端，页面初始化改为分页读取会话和消息。
2. 对现有 `pai:v1:*` 快照执行一次性导入：前端生成 `importBatchId`，后端校验最多 30 个会话、
   每个最多 200 条稳定消息，并以 `importBatchId` 保证重复提交不会重复导入。

导入成功后写入本地迁移标志，再删除旧快照。错误或流式中的历史状态统一恢复为 aborted；
浏览器消息 ID 只作为导入幂等输入，不直接作为数据库主键。

## 6. 向量数据库选型

### 推荐：Qdrant

| 方案 | 结论 |
| --- | --- |
| MySQL 8.x | 继续作为业务事实源；不承担 ANN 向量检索 |
| PostgreSQL + pgvector | 能工作且 Mastra 支持，但会引入第二个关系型数据库及两套迁移/备份职责 |
| Qdrant | 推荐；专门承担可重建向量索引，支持 Payload 过滤和多租户分区 |
| Pinecone 等托管服务 | 部署条件要求免运维时再评估，应用数据模型不依赖它 |

Mastra 侧通过 `@mastra/rag` 的查询 Tool 和 `@mastra/vector-qdrant` 适配；业务 Service 仍负责
权限过滤和 MySQL 回源，不让 Agent 直接拼接 tenant 过滤条件。

### 6.1 Collection 策略

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

## 7. MySQL 知识与索引任务

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

## 8. 分阶段实施

### 阶段 A：后端会话事实源

- 创建 conversations/messages/runs/sources 迁移和 Repository 测试。
- 增加会话 CRUD、消息分页和新的 SSE 发送端点。
- 后端加载有限历史；保留当前 Agent 和 Tool 行为。
- 验收：跨设备恢复、用户隔离、幂等重试、取消/失败恢复、游标分页。

### 阶段 B：前端迁移

- X SDK 默认消息改从后端分页加载。
- 删除持续 localStorage 快照写入，只保留一次性导入代码。
- 验收：刷新、切换浏览器、删除和中断恢复均以数据库为准。

### 阶段 C：知识元数据和摄取

- 建知识库/文档/切片/索引任务表，对象存储和解析 Worker。
- 先完成确定性切片、checksum、版本和重建，不接 Agent。

### 阶段 D：Qdrant RAG

- 部署 Qdrant，创建单模型 Collection 和 Payload Index。
- 接 Embedding、Top-K、MySQL 回源、引用和检索评测。
- 用受控 Knowledge Tool 替换当前“全量本地文章注入”。

### 阶段 E：可选语义记忆

只有出现“跨长会话语义回忆”的明确需求后，才把精选消息摘要或观察记录写入独立 Collection；
不得默认向量化所有原始聊天，也不得跨用户或 Organization 召回。

## 9. 开发前仍需确认

1. 会话是纯个人数据，还是 Organization 内可共享。
2. 历史消息和推理内容的保留期限；是否允许用户彻底删除。
3. 是否保留并展示 `reasoning_content`，以及敏感数据策略。
4. 旧 localStorage 是否必须迁移，还是可以从新版本开始空白。
5. Embedding Provider、模型、维度、数据出境和成本要求。
6. Qdrant 使用 Cloud 还是自托管，以及备份、恢复和区域要求。
7. RAG Top-K、chunk size、overlap 和引用准确率的验收数据集。
