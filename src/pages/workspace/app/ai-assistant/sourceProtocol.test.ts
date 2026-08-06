import { describe, expect, it } from 'vitest';
import { selectCitedMessageSources } from './sourceProtocol';
import type { MessageSource } from './types';

const sources: MessageSource[] = [
  {
    sourceId: 'article-001',
    sourceType: 'knowledge',
    title: '内部资料一',
  },
  {
    sourceId: 'article-002',
    sourceType: 'knowledge',
    title: '内部资料二',
  },
  {
    sourceId: 'web-1',
    sourceType: 'web',
    title: '公开网页一',
    sourceUrl: 'https://example.com/web-1',
  },
  {
    sourceId: 'web-2',
    sourceType: 'web',
    title: '公开网页二',
    sourceUrl: 'https://example.com/web-2',
  },
];

describe('selectCitedMessageSources', () => {
  it('keeps only knowledge IDs and web URLs cited by the final answer', () => {
    const content = `
<think>
曾考虑 [资料:article-002] 和 https://example.com/web-2。
</think>
内部结论来自 [资料:article-001]，公开信息见
[公开网页一](https://example.com/web-1)。
    `.trim();

    expect(selectCitedMessageSources(content, sources)).toEqual([
      sources[0],
      sources[2],
    ]);
  });

  it('returns no sources when the answer does not cite any candidate', () => {
    expect(
      selectCitedMessageSources('联网检索没有找到与问题相关的信息。', sources),
    ).toEqual([]);
  });

  it('handles messages without candidate sources', () => {
    expect(selectCitedMessageSources('普通回答', undefined)).toEqual([]);
  });
});
