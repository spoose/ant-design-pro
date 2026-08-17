import { describe, expect, it } from 'vitest';
import { getSkillDefinition, skillRegistry } from './skillRegistry';

describe('skillRegistry', () => {
  it('maps every configured skill code to static UI metadata', () => {
    expect(Object.keys(skillRegistry)).toEqual([
      'ai-assistant',
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
    expect(getSkillDefinition('file-review')?.pageComponent).toBeDefined();
    expect(getSkillDefinition('knowledge-search')?.pageComponent).toBeDefined();
    expect(getSkillDefinition('ai-assistant')).toMatchObject({
      title: 'pAI',
      navigation: [
        { pathSegment: 'overview', title: '通用助手' },
        { pathSegment: 'resources', title: '资源' },
        { pathSegment: 'memory', title: '记忆', placeholder: true },
      ],
    });
    expect(getSkillDefinition('ai-assistant')?.pageComponent).toBeDefined();
    expect(
      getSkillDefinition('document-summary')?.pageComponent,
    ).toBeUndefined();
  });

  it('exposes an unknown backend skill instead of silently remapping it', () => {
    expect(getSkillDefinition('missing-skill')).toBeUndefined();
  });
});
