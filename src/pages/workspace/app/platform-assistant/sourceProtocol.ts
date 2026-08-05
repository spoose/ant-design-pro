/**
 * 消息来源协议边界：
 * 将 SSE 或 localStorage 中的未知数据校验、清洗为 MessageSource[]；
 * Provider 与持久化层共享该入口，避免不可信 URL 或损坏数据进入 UI。
 */
import type { MessageSource } from './types';

const SOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSourceType = (value: unknown): value is MessageSource['sourceType'] =>
  value === 'knowledge' || value === 'web';

const normalizeHttpUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * 校验来自 SSE 或 localStorage 的消息来源。
 *
 * 两条入口都属于运行时不可信数据，因此共享同一校验边界；
 * sourceUrl 只允许 HTTP(S)；旧数据未携带 sourceType 时按 knowledge 恢复。
 */
export const normalizeMessageSources = (
  value: unknown,
): MessageSource[] | undefined => {
  if (!Array.isArray(value) || value.length === 0) return undefined;

  const sources: MessageSource[] = [];
  const sourceIds = new Set<string>();
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.sourceId !== 'string' ||
      !SOURCE_ID_PATTERN.test(item.sourceId) ||
      typeof item.title !== 'string' ||
      !item.title.trim() ||
      (item.sourceType !== undefined && !isSourceType(item.sourceType)) ||
      sourceIds.has(item.sourceId)
    ) {
      return undefined;
    }

    sourceIds.add(item.sourceId);
    const sourceUrl = normalizeHttpUrl(item.sourceUrl);
    sources.push({
      sourceId: item.sourceId,
      sourceType: isSourceType(item.sourceType) ? item.sourceType : 'knowledge',
      title: item.title.trim(),
      ...(sourceUrl ? { sourceUrl } : {}),
      ...(typeof item.snippet === 'string' && item.snippet.trim()
        ? { snippet: item.snippet.trim() }
        : {}),
      ...(typeof item.publishedAt === 'string'
        ? { publishedAt: item.publishedAt }
        : {}),
      ...(typeof item.updatedAt === 'string'
        ? { updatedAt: item.updatedAt }
        : {}),
    });
  }

  return sources;
};

/**
 * 只消费本站定义的 sources SSE 事件；文本和推理事件继续交给 Provider。
 */
export const parseMessageSourcesEvent = (
  event: unknown,
  data: unknown,
): MessageSource[] | undefined => {
  if (event !== 'sources') return undefined;

  try {
    const payload = typeof data === 'string' ? JSON.parse(data) : data;
    return isRecord(payload)
      ? normalizeMessageSources(payload.sources)
      : undefined;
  } catch {
    return undefined;
  }
};

const removeReasoningContent = (content: string): string =>
  content.replace(/<think>[\s\S]*?<\/think>/g, '');

/**
 * 从候选来源中保留最终回答实际引用的来源。
 *
 * 知识库使用后端约定的 [资料:sourceId] 标记，网页使用原始 URL；
 * 推理流中可能也出现来源，但不属于用户可见答案，必须先排除。
 */
export const selectCitedMessageSources = (
  content: string,
  sources: readonly MessageSource[] | undefined,
): MessageSource[] => {
  if (!sources?.length) return [];

  const answerContent = removeReasoningContent(content);
  return sources.filter((source) =>
    source.sourceType === 'knowledge'
      ? answerContent.includes(`[资料:${source.sourceId}]`)
      : Boolean(source.sourceUrl && answerContent.includes(source.sourceUrl)),
  );
};
