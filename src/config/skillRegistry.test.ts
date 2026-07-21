import { describe, expect, it } from 'vitest';
import { getSkillDefinition, skillRegistry } from './skillRegistry';

describe('skillRegistry', () => {
  it('maps every configured skill code to static UI metadata', () => {
    expect(Object.keys(skillRegistry)).toEqual([
      'file-review',
      'document-summary',
      'knowledge-search',
    ]);
    expect(getSkillDefinition('file-review')).toMatchObject({
      title: '文件审查',
      navigation: [
        { pathSegment: 'overview', title: '审查工作台' },
        { pathSegment: 'queue', title: '待审文件' },
        { pathSegment: 'history', title: '审查记录' },
      ],
    });
  });

  it('exposes an unknown backend skill instead of silently remapping it', () => {
    expect(getSkillDefinition('missing-skill')).toBeUndefined();
  });
});
