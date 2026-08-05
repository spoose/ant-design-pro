import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import {
  type KnowledgeMaterial,
  knowledgeMaterialSchema,
} from './knowledgeMaterial.js';

export const articleSourceIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
    'sourceId 只能包含字母、数字、下划线和连字符',
  );

/**
 * 磁盘 metadata.json 的可信边界。
 *
 * originalFileName、mediaType、ingestedAt 用于确认资料来源记录完整；
 * 这些存档字段不属于 KnowledgeMaterial，因此不会进入 Workflow 或 Prompt。
 */
const articleMetadataSchema = z
  .object({
    sourceId: articleSourceIdSchema,
    title: z.string().trim().min(1).max(500),
    originalFileName: z.string().trim().min(1).max(500),
    mediaType: z.string().trim().min(1).max(200),
    sourceUrl: z.string().url().optional(),
    publishedAt: z.string().datetime({ offset: true }).optional(),
    updatedAt: z.string().datetime({ offset: true }).optional(),
    ingestedAt: z.string().datetime({ offset: true }),
    // 固定正文文件名，避免 metadata 间接指向任意本机路径。
    contentFile: z.literal('content.md'),
  })
  .strict();

function isMissingFile(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

/**
 * 将底层文件系统错误转换为包含 sourceId 的业务错误。
 */
async function readRequiredFile(
  filePath: string,
  fileName: string,
  sourceId: string,
): Promise<string> {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (isMissingFile(error)) {
      throw new Error(`资料 ${sourceId} 缺少 ${fileName}`, { cause: error });
    }
    throw new Error(`读取资料 ${sourceId} 的 ${fileName} 失败`, {
      cause: error,
    });
  }
}

function formatValidationIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const field = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${field}: ${issue.message}`;
    })
    .join('; ');
}

/**
 * 读取一篇本地文章，并将 metadata.json 与 content.md
 * 合并为所有 AI 消费方共享的 KnowledgeMaterial。
 */
async function loadOneLocalKnowledgeMaterial(
  rootDirectory: string,
  sourceIdInput: string,
): Promise<KnowledgeMaterial> {
  // 第一道边界：拒绝 ../、斜杠和其他路径字符。
  const sourceIdResult = articleSourceIdSchema.safeParse(sourceIdInput);
  if (!sourceIdResult.success) {
    throw new Error(
      `无效的资料 sourceId: ${formatValidationIssues(sourceIdResult.error)}`,
    );
  }
  const sourceId = sourceIdResult.data;
  const articleDirectory = resolve(rootDirectory, sourceId);

  // 第二道边界：文章目录必须是资料根目录的直接子目录。
  if (dirname(articleDirectory) !== rootDirectory) {
    throw new Error(`资料 ${sourceId} 的路径越界`);
  }

  // 先以普通字符串读取磁盘内容，此时还不能信任其中的字段。
  const metadataText = await readRequiredFile(
    join(articleDirectory, 'metadata.json'),
    'metadata.json',
    sourceId,
  );

  let metadataJson: unknown;
  try {
    metadataJson = JSON.parse(metadataText);
  } catch (error) {
    throw new Error(`资料 ${sourceId} 的 metadata.json 不是有效 JSON`, {
      cause: error,
    });
  }

  // 第三道边界：metadata 通过严格 Schema 后才能参与正文读取和 Prompt 数据构造。
  const metadataResult = articleMetadataSchema.safeParse(metadataJson);
  if (!metadataResult.success) {
    throw new Error(
      `资料 ${sourceId} 的 metadata.json 不符合规范: ${formatValidationIssues(
        metadataResult.error,
      )}`,
    );
  }
  const metadata = metadataResult.data;

  // 请求目录与文件内部声明必须指向同一份资料。
  if (metadata.sourceId !== sourceId) {
    throw new Error(
      `资料目录 ${sourceId} 与 metadata.sourceId ${metadata.sourceId} 不一致`,
    );
  }

  const content = await readRequiredFile(
    join(articleDirectory, metadata.contentFile),
    metadata.contentFile,
    sourceId,
  );

  // 只构造共享资料模型允许的字段，不把存档字段或磁盘路径发送给模型。
  const materialResult = knowledgeMaterialSchema.safeParse({
    sourceId,
    title: metadata.title,
    content,
    ...(metadata.sourceUrl ? { sourceUrl: metadata.sourceUrl } : {}),
    ...(metadata.publishedAt ? { publishedAt: metadata.publishedAt } : {}),
    ...(metadata.updatedAt ? { updatedAt: metadata.updatedAt } : {}),
  });
  if (!materialResult.success) {
    throw new Error(
      `资料 ${sourceId} 的正文不符合规范: ${formatValidationIssues(
        materialResult.error,
      )}`,
    );
  }

  return materialResult.data;
}

/**
 * 按 sourceIds 的顺序直接拼接本地 metadata 与正文。
 *
 * 本函数不会遍历目录、自动发现资料、调用模型或执行权限判断。
 */
export async function loadLocalKnowledgeMaterials(
  articlesDirectory: string,
  sourceIds: readonly string[],
): Promise<KnowledgeMaterial[]> {
  // 使用绝对路径作为统一基准，避免工作目录差异影响路径边界判断。
  const rootDirectory = resolve(articlesDirectory);
  const materials: KnowledgeMaterial[] = [];

  // 顺序读取，使最终引用顺序与调用方选择顺序保持一致。
  for (const sourceId of sourceIds) {
    materials.push(
      await loadOneLocalKnowledgeMaterial(rootDirectory, sourceId),
    );
  }

  return materials;
}

/**
 * 自动发现资料根目录下的直接子目录，并复用按 sourceId 加载的安全边界。
 *
 * 只接受合法 sourceId 命名的真实目录，不跟随文件或符号链接；
 * 排序后加载可保证知识上下文与测试结果稳定。
 */
export async function loadAllLocalKnowledgeMaterials(
  articlesDirectory: string,
): Promise<KnowledgeMaterial[]> {
  const rootDirectory = resolve(articlesDirectory);
  let entries: Dirent[];
  try {
    entries = await readdir(rootDirectory, { withFileTypes: true });
  } catch (error) {
    throw new Error('读取本地知识库目录失败', { cause: error });
  }

  const sourceIds = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const result = articleSourceIdSchema.safeParse(entry.name);
      if (!result.success) {
        throw new Error(
          `知识库包含无效的资料目录 ${entry.name}: ${formatValidationIssues(
            result.error,
          )}`,
        );
      }
      return result.data;
    })
    .sort((left, right) => left.localeCompare(right));

  if (sourceIds.length === 0) {
    throw new Error('本地知识库没有可用资料');
  }

  return loadLocalKnowledgeMaterials(rootDirectory, sourceIds);
}
