# AI 文章资料存储规范

> 状态：本地读取桥接层已实现；尚未实现 HTTP、上传、解析或数据库持久化
>
> 最近更新：2026-07-29（Asia/Hong_Kong）

## 1. 当前推荐

只有几份文章时，不需要立即引入对象存储、向量数据库或复杂知识库。后端本地开发可使用：

```text
server/.data/ai/articles/
└── article-001/
    ├── original.pdf
    ├── content.md
    └── metadata.json
```

`server/.data/` 必须被 Git 忽略，真实业务资料、版权内容和敏感信息不得提交到仓库。公开
且专门用于自动化测试的极小样例，应单独放在 `tests/fixtures/`。

## 2. 三类文件的职责

### 2.1 `original.*`

保留用户提供的原始文件，例如 PDF、DOCX、HTML 或 TXT。它是审计和重新解析的依据，
不直接作为 Agent Prompt。

### 2.2 `content.md`

使用 UTF-8 Markdown 保存清洗后的正文，作为当前 Workflow 的标准文本输入：

```md
# 文章标题

## 第一部分

规范化后的正文……
```

规范：

- 保留标题层级、列表、表格和必要引用。
- 删除页面导航、广告、页眉页脚等噪声。
- 图片暂时写成带说明的 Markdown 引用，不把图片二进制嵌入正文。
- 不把摘要当作原文；如生成摘要，应单独存储。
- 不在正文中混入系统 Prompt、权限信息或 Agent 指令。

### 2.3 `metadata.json`

保存稳定标识、来源和时间信息：

```json
{
  "sourceId": "article-001",
  "title": "企业知识库实践",
  "originalFileName": "enterprise-knowledge.pdf",
  "mediaType": "application/pdf",
  "sourceUrl": "https://example.com/articles/001",
  "publishedAt": "2026-07-01T00:00:00Z",
  "updatedAt": "2026-07-29T00:00:00Z",
  "ingestedAt": "2026-07-29T08:00:00Z",
  "contentFile": "content.md"
}
```

要求：

- `sourceId` 一旦创建就保持稳定，文件名或标题变化时不要更换。
- 时间使用 UTC RFC 3339。
- 无法确认的字段应省略，不要编造发布时间或来源地址。
- 后续可增加 `organizationId`、权限、校验和和解析器版本，但需求未确认前不提前添加。

## 3. 与 Workflow 的关系

核心 Workflow 仍不负责读磁盘。当前本地开发链路已经实现为：

```text
ResearchIntroductionService 接收 sourceIds
→ loadLocalResearchMaterials 读取 metadata.json + content.md
→ Zod 校验目录标识、元数据和正文
→ 转换为 ResearchMaterial[]
→ Research Introduction Workflow
```

对应代码：

- `src/ai/materials/loadLocalResearchMaterials.ts`：`sourceId` 规则、本地读取和资料转换。
- `src/ai/services/researchIntroductionService.ts`：桥接资料和 Workflow。

本地函数拒绝 `../` 等路径穿越、目录与 `metadata.sourceId` 不一致、缺失文件和重复
`sourceId`。它只读取调用方明确列出的资料，不会枚举整个资料目录。当前只有一个本地
实现，因此没有提前保留 Storage 接口和类；出现第二种资料来源时再抽象。

Workflow 接收的是已经授权并解析完成的内部对象：

```ts
interface ResearchMaterial {
  sourceId: string;
  title: string;
  content: string;
  sourceUrl?: string;
  publishedAt?: string;
  updatedAt?: string;
}
```

不能让客户端直接声明任意本机文件路径，也不能让 Agent 自行遍历 `.data`。

未来开放 HTTP 时，调用链前面还必须增加 Express 鉴权和 Organization Scope；这部分
目前没有实现，不能把现有 Service 直接视为生产权限边界。

## 4. 暂不推荐的存储方式

- **浏览器 localStorage**：不适合文章原文、跨设备同步和权限控制。
- **MySQL BLOB / LONGTEXT 作为唯一原文存储**：少量数据可以工作，但以后处理大文件、
  重新解析和对象生命周期会比较困难。
- **只保存向量切片**：向量切片是派生索引，不能替代原文件和规范化正文。
- **把真实文章提交到 Git**：会引入版权、隐私、仓库体积和删除历史问题。

## 5. 未来生产演进

资料量和多人协作增加后，再迁移为：

| 数据 | 推荐存储 |
| --- | --- |
| 原始文件 | S3 / MinIO 等对象存储 |
| 规范化 Markdown | 对象存储，或小规模时保留在数据库文本字段 |
| 标题、来源、权限和状态 | MySQL |
| 文档切片与 Embedding | Qdrant / pgvector 等向量存储 |
| Workflow 任务状态 | MySQL + 任务队列 |

原文件、规范化正文和元数据是事实来源；向量索引可以随时重建。
