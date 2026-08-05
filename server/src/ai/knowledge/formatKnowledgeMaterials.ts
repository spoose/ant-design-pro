import type {
  KnowledgeMaterial,
  KnowledgeSource,
} from './knowledgeMaterial.js';

/**
 * 从模型上下文资料中挑选可安全返回给前端的来源元数据。
 * 正文只进入模型 Prompt，不进入来源事件，避免重复传输文章内容。
 */
export function toKnowledgeSources(
  materials: readonly KnowledgeMaterial[],
): KnowledgeSource[] {
  return materials.map(
    ({ sourceId, title, sourceUrl, publishedAt, updatedAt }) => ({
      sourceId,
      title,
      ...(sourceUrl ? { sourceUrl } : {}),
      ...(publishedAt ? { publishedAt } : {}),
      ...(updatedAt ? { updatedAt } : {}),
    }),
  );
}

function formatOptionalMetadata(
  label: string,
  value: string | undefined,
): string {
  return value ? `${label}：${value}` : `${label}：未提供`;
}

/**
 * 将已校验的 KnowledgeMaterial 转换为模型可读的统一资料块。
 *
 * 通用 pAI 知识库和研究介绍 Workflow 共用这一格式，避免两条链路
 * 各自拼接 metadata 与正文后逐渐产生不同的引用语义。
 */
export function formatKnowledgeMaterialsForPrompt(
  materials: readonly KnowledgeMaterial[],
): string {
  return materials
    .map((material, index) =>
      `
<material index="${index + 1}" sourceId="${material.sourceId}">
标题：${material.title}
${formatOptionalMetadata('来源 URL', material.sourceUrl)}
${formatOptionalMetadata('发布时间', material.publishedAt)}
${formatOptionalMetadata('更新时间', material.updatedAt)}

正文：
${material.content}
</material>
      `.trim(),
    )
    .join('\n\n');
}
