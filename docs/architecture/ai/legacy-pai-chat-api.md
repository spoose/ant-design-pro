# 旧版 pAI 对话 API

> 适用范围：Workspace 中的 `xOneAI / pAI` 旧接口，不包含 `/chatbot` 演示接口。
>
> 最近更新：2026-08-26（Asia/Taipei）

## 1. 通用约定

Base URL：

```text
/api
```

所有接口使用 Bearer Token：

```http
Authorization: Bearer <accessToken>
```

普通 JSON 接口成功响应：

```json
{
  "success": true,
  "data": {},
  "traceId": "trace-id"
}
```

失败响应：

```json
{
  "success": false,
  "errorCode": "ERROR_CODE",
  "errorMessage": "错误说明",
  "traceId": "trace-id"
}
```

## 2. 会话接口

### 2.1 创建会话

```http
POST /api/pai/conversations
Content-Type: application/json
```

Platform 请求：

```json
{
  "scopeType": "platform",
  "title": "合同审查"
}
```

Organization 请求：

```json
{
  "scopeType": "organization",
  "organizationId": "2b28f74e-6274-4ae1-8528-b13843550fa2",
  "title": "合同审查"
}
```

响应示例：

```json
{
  "success": true,
  "data": {
    "conversationId": "bbc6ca8e-c50a-4b85-97ea-8f92d29f321a",
    "ownerUserId": "fba53421-683c-41dd-aa1c-613f7b89fd40",
    "scope": {
      "type": "organization",
      "organizationId": "2b28f74e-6274-4ae1-8528-b13843550fa2"
    },
    "title": "合同审查",
    "createdAt": "2026-08-26T08:00:00.000Z",
    "updatedAt": "2026-08-26T08:00:00.000Z"
  },
  "traceId": "trace-create-001"
}
```

### 2.2 获取会话列表

Platform：

```http
GET /api/pai/conversations?scopeType=platform&limit=30
```

Organization：

```http
GET /api/pai/conversations?scopeType=organization&organizationId=2b28f74e-6274-4ae1-8528-b13843550fa2&limit=30
```

`data` 为会话对象数组。`limit` 范围为 `1–100`，默认值为 `30`。

### 2.3 获取会话历史

```http
GET /api/pai/conversations/{conversationId}
```

响应示例：

```json
{
  "success": true,
  "data": {
    "conversation": {
      "conversationId": "bbc6ca8e-c50a-4b85-97ea-8f92d29f321a",
      "ownerUserId": "fba53421-683c-41dd-aa1c-613f7b89fd40",
      "scope": {
        "type": "platform"
      },
      "title": "合同审查",
      "createdAt": "2026-08-26T08:00:00.000Z",
      "updatedAt": "2026-08-26T08:05:00.000Z"
    },
    "turns": [
      {
        "runId": "run-id",
        "turnNo": 1,
        "status": "completed",
        "errorCode": null,
        "knowledgeEnabled": true,
        "webSearchEnabled": false,
        "modelProvider": "deepseek",
        "modelName": "deepseek-chat",
        "startedAt": "2026-08-26T08:01:00.000Z",
        "completedAt": "2026-08-26T08:01:08.000Z",
        "messages": [
          {
            "messageId": "user-message-id",
            "role": "user",
            "status": "completed",
            "content": "请检查这份合同中的责任风险",
            "createdAt": "2026-08-26T08:01:00.000Z",
            "completedAt": "2026-08-26T08:01:00.000Z",
            "sources": []
          },
          {
            "messageId": "assistant-message-id",
            "role": "assistant",
            "status": "completed",
            "content": "该条款存在责任边界不明确的问题。",
            "createdAt": "2026-08-26T08:01:00.000Z",
            "completedAt": "2026-08-26T08:01:08.000Z",
            "sources": []
          }
        ]
      }
    ]
  },
  "traceId": "trace-history-001"
}
```

Run 和消息的 `status` 可能为：

```text
pending | streaming | completed | failed | aborted
```

### 2.4 修改会话标题

```http
PATCH /api/pai/conversations/{conversationId}
Content-Type: application/json
```

```json
{
  "title": "供应商合同风险审查"
}
```

响应 `data` 为更新后的会话对象。

### 2.5 删除会话

```http
DELETE /api/pai/conversations/{conversationId}
```

```json
{
  "success": true,
  "data": {
    "deleted": true
  },
  "traceId": "trace-delete-001"
}
```

## 3. 发送消息

### 3.1 请求

```http
POST /api/pai/conversations/{conversationId}/runs
Content-Type: application/json
Accept: text/event-stream
```

请求体：

```json
{
  "idempotencyKey": "57db2818-cc78-4f1e-90ec-0587a7d601bb",
  "content": "请检查这份合同中的责任风险",
  "knowledgeEnabled": true,
  "webSearchEnabled": false
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `idempotencyKey` | 是 | UUID；重复提交时复用原 Run，避免重复调用模型 |
| `content` | 是 | 本轮用户消息，最长 100000 个字符 |
| `knowledgeEnabled` | 否 | 是否启用知识资料，默认 `false` |
| `webSearchEnabled` | 否 | 是否允许联网搜索，默认 `false` |

客户端只提交本轮消息，不提交历史、模型名或 System Prompt。服务端根据
`conversationId` 从数据库读取可信历史。

cURL 示例：

```bash
curl -N \
  -X POST "http://localhost:3000/api/pai/conversations/bbc6ca8e-c50a-4b85-97ea-8f92d29f321a/runs" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "idempotencyKey": "57db2818-cc78-4f1e-90ec-0587a7d601bb",
    "content": "请检查这份合同中的责任风险",
    "knowledgeEnabled": true,
    "webSearchEnabled": false
  }'
```

### 3.2 响应：SSE 流

服务端响应头：

```http
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
X-Accel-Buffering: no
```

该接口的响应体不是单个 JSON，也不使用普通接口的
`{ success, data, traceId }` 信封。响应体由多个 SSE 事件块组成；每个事件块包含
`event` 和 `data` 两行，并以一个空行分隔。连接正常结束时服务端直接关闭响应流，
不会再发送 OpenAI 风格的 `[DONE]`。

`run` 只是响应体最先到达的事件，不是完整响应。服务端会在同一个 HTTP Response Body
中继续写入推理、正文和来源事件，最后写入 `done` 或 `error`。如果调试工具只显示：

```text
event: run
data: {...}
```

表示工具当前只读取到了第一个流式分片，连接尚未结束；需要继续读取该响应流。使用
`curl -N` 可以在事件到达时持续打印全部内容。

#### 3.2.1 完整响应体示例

下面是一轮正常完成的原始 HTTP 响应体。实际响应会分批到达，而不是一次性返回：
响应：HTTP 200 + text/event-stream; charset=utf-8，事件分批到达，顺序如下：

{conversationId, runId, turnNo,  userMessageId, assistantMessageId, status: "streaming", replayed}                     │

```text
event: run
data: {"conversationId":"bbc6ca8e-c50a-4b85-97ea-8f92d29f321a","runId":"a8204a32-caca-44df-8b84-c6ec648dce21","turnNo":1,"userMessageId":"fe5beb31-acf6-45a6-94c4-7f8326c073c3","assistantMessageId":"c5f9b5c1-d423-4b23-99fe-070fc5e3a2bb","status":"streaming","replayed":false}

event: reasoning-delta
data: {"text":"先识别责任主体、触发条件和赔偿范围。"}

event: sources
data: {"sources":[{"sourceId":"article-001","sourceType":"knowledge","title":"合同审查规范","sourceUrl":"https://example.com/article","snippet":"责任边界审查要求","updatedAt":"2026-08-20T00:00:00.000Z"}]}

event: text-delta
data: {"text":"根据[资料:article-001]，该条款存在责任边界不明确的问题。"}

event: text-delta
data: {"text":"建议补充责任触发条件、赔偿上限和例外情形。"}

event: done
data: {"runId":"a8204a32-caca-44df-8b84-c6ec648dce21","status":"completed"}

```

客户端按顺序拼接两个 `text-delta.text` 后得到最终回答：

```text
根据[资料:article-001]，该条款存在责任边界不明确的问题。建议补充责任触发条件、赔偿上限和例外情形。
```

#### 3.2.2 SSE 从开启到结束

1. 客户端携带 Bearer Token、`conversationId` 和请求体发起 `POST /runs`。
2. 服务端先完成鉴权、URL/请求体校验、会话归属检查，并创建或幂等命中 Run。
3. 如果在响应头发送前失败，服务端返回普通 JSON 错误和对应的 4xx/5xx 状态，不会开启 SSE。
4. 准备好 Run 后，服务端返回 HTTP 200，设置 `Content-Type: text/event-stream` 并立即发送响应头，SSE 连接正式建立。
5. 服务端首先发送且只发送一次 `run` 事件，客户端可从中取得 `runId`、消息 ID、轮次和是否幂等重放。
6. 生成期间按实际情况发送零到多个 `reasoning-delta`、`text-delta` 和 `sources`；三类事件可能交错，`sources` 也可能多次更新。
7. 正常完成时，服务端先保存最终回答、来源和 Run 状态，再发送 `done`，随后关闭 HTTP 响应流。
8. SSE 已建立后发生模型或业务错误时，服务端发送 `error`，随后关闭响应流；该路径通常不会再发送 `done`。
9. 客户端主动取消或网络断开时，连接关闭会触发服务端中止上游模型请求。由于客户端已经断开，它不一定能收到最终事件；重新进入会话时应通过历史接口获取持久化的 `aborted` 或 `failed` 状态。

正常流程：

```text
POST /runs
→ HTTP 200 + SSE 响应头
→ run
→ reasoning-delta / text-delta / sources（零到多次）
→ done
→ 服务端关闭连接
```

流中失败流程：

```text
POST /runs
→ HTTP 200 + SSE 响应头
→ run
→ 已生成的增量事件（可能没有）
→ error
→ 服务端关闭连接
```

建流前失败流程：

```text
POST /runs
→ HTTP 4xx/5xx + application/json
→ 不产生任何 SSE 事件
```

#### 3.2.3 `run`

返回本轮 Run 元数据：

```text
event: run
data: {"conversationId":"bbc6ca8e-c50a-4b85-97ea-8f92d29f321a","runId":"run-id","turnNo":1,"userMessageId":"user-message-id","assistantMessageId":"assistant-message-id","status":"streaming","replayed":false}
```

`replayed=true` 表示本次请求通过 `idempotencyKey` 命中已存在的 Run，没有再次调用模型。

#### 3.2.4 `reasoning-delta`

推理内容增量：

```text
event: reasoning-delta
data: {"text":"先分析责任主体和赔偿范围。"}
```

#### 3.2.5 `text-delta`

正式回答增量：

```text
event: text-delta
data: {"text":"该条款存在责任边界不明确的问题。"}
```

客户端需要按接收顺序拼接多个 `text-delta.text`。

#### 3.2.6 `sources`

候选引用来源：

```text
event: sources
data: {"sources":[{"sourceId":"article-001","sourceType":"knowledge","title":"合同审查规范","sourceUrl":"https://example.com/article","snippet":"责任边界审查要求","updatedAt":"2026-08-20T00:00:00.000Z"}]}
```

来源结构：

```ts
{
  sourceId: string;
  sourceType: 'knowledge' | 'web';
  title: string;
  sourceUrl?: string;
  snippet?: string;
  publishedAt?: string;
  updatedAt?: string;
}
```

#### 3.2.7 `done`

```text
event: done
data: {"runId":"run-id","status":"completed"}
```

`status` 可能为 `completed`、`failed` 或 `aborted`。

#### 3.2.8 `error`

SSE 已建立后的业务失败：

```text
event: error
data: {"errorCode":"AI_MODEL_UNAVAILABLE","errorMessage":"模型服务暂时不可用"}
```

出现 `error` 事件时 HTTP 状态仍可能为 `200`，客户端必须依据 SSE 事件判断业务结果。

### 3.3 客户端处理顺序

```text
创建或选择 conversationId
→ 生成 UUID idempotencyKey
→ POST /runs
→ 保存 run 事件中的 ID
→ 累加 reasoning-delta
→ 累加 text-delta
→ 更新 sources
→ 根据 done 或 error 判断最终状态
→ 必要时 GET 会话历史重新同步
```

该接口不是标准 OpenAI Chat Completions 协议，而是旧版 pAI 的业务会话和自定义 SSE 协议。
