# AI 模块

> 状态：统一 pAI Agent、Web Search Tool、本地资料桥接层和项目 SSE 已接入产品链路

本目录承载模型接入和 AI 编排代码。HTTP、认证、Organization 权限、数据库 Repository
和通用业务 Service 继续保留在现有目录，不移动到 AI 模块。

```text
src/ai/
├── agents/       开放式任务的 Agent 定义
├── knowledge/    独立知识资料模型、本地加载和 Prompt 格式化
├── models/       Mastra Model Router 的模型 ID 规范化
├── services/     连接业务输入、资料读取、Agent 和 Workflow
├── tools/        Agent 可调用的受控业务能力
└── workflows/    输入输出明确的确定性多步骤流程
```

当前约束：

1. Agent 和 Workflow 通过工厂按需创建，不在模块导入时注册或调用模型。
2. `/api/pai/chat/completions` 输出项目自有 SSE，不向前端暴露模型或 Mastra 原生事件。
3. 不在本目录实现认证、租户权限或数据库查询。
4. `knowledge/` 不依赖 Route、Mastra 或模型 Provider；pAI 和 Workflow 都只能作为消费者。
5. Workflow 只接收后端已经授权、解析完成的资料；本地读取由 Service 在调用前完成。
6. PPT 生成仍属于未来能力，不预留实现代码。

当前核心链路：

```text
researchPurpose + interestDirections + sourceIds
→ ResearchIntroductionService
→ loadLocalKnowledgeMaterials（metadata.json + content.md）
→ prepare-research-context
→ research-introduction-agent
→ introduction + sources
```

`loadLocalKnowledgeMaterials` 只能根据合法 `sourceId` 读取固定目录结构，不接受任意文件路径。

pAI 当前链路：

```text
knowledgeEnabled + webSearchEnabled + 完整 messages
→ 可选 loadAllLocalKnowledgeMaterials + knowledge system message
→ PaiAgentService
→ pAI Agent（按请求启用或关闭 webSearchTool）
→ Mastra Model Router → DeepSeek
→ reasoning-delta / text-delta / sources / done
```

该入口继续使用现有 pAI 鉴权。客户端不能指定文章路径或 `sourceId`；未来实现 RAG 时，
让 Retriever 继续返回 `KnowledgeMaterial[]`，即可用 Top-K 检索结果替换“加载全部文章”，
并复用后续消息组装和 SSE 链路。Agent 的 `maxSteps` 固定为 3，搜索最多调用两次且只允许
一次纠错重试。Service 在每次请求时读取当前日期并和联网开关一起交给 Agent；客户端只
允许提交 `user` / `assistant` 消息，不能伪造系统上下文。当前不启用 Mastra Memory，
因为浏览器会随请求提交完整会话历史。

## 本地真实验证

后端 `.env` 配置 `DEEPSEEK_API_KEY` 后，可从 `server` 目录运行：

```bash
npm run research:introduction:local
```

如果当前 worktree 没有独立 `.env`，可显式复用已有配置：

```bash
DOTENV_CONFIG_PATH=/absolute/path/to/server/.env \
npm run research:introduction:local
```

脚本固定选择当前三篇本地文章，执行一次真实的非流式 DeepSeek 调用，并打印生成介绍和
来源列表。它不会启动 HTTP 服务、连接 MySQL、保存模型输出或打印文章全文。
