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
      path: '/chatbot?skill=file-review',
    });
  });

  it('exposes an unknown backend skill instead of silently remapping it', () => {
    expect(getSkillDefinition('missing-skill')).toBeUndefined();
  });
});
