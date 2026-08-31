import { describe, expect, it } from 'vitest';
import { appRegistry, getAppDefinition } from './appRegistry';

describe('appRegistry', () => {
  it('maps every configured app code to static UI metadata', () => {
    expect(Object.keys(appRegistry)).toEqual([
      'ai-assistant',
      'integrated-operations',
      'drone-operations',
      'file-review',
      'document-summary',
      'knowledge-search',
    ]);
    expect(getAppDefinition('file-review')).toMatchObject({
      title: '文件审查',
      navigation: [
        { pathSegment: 'overview', title: '审查工作台' },
        { pathSegment: 'queue', title: '待审文件' },
        { pathSegment: 'history', title: '审查记录' },
      ],
    });
    expect(getAppDefinition('file-review')?.pageComponent).toBeDefined();
    expect(getAppDefinition('knowledge-search')?.pageComponent).toBeDefined();
    expect(getAppDefinition('integrated-operations')).toMatchObject({
      title: '集约运维',
      navigation: [{ pathSegment: 'overview', title: '运维总览' }],
    });
    expect(getAppDefinition('drone-operations')).toMatchObject({
      title: '政务低空',
      navigation: [{ pathSegment: 'overview', title: '运行总览' }],
    });
    expect(getAppDefinition('ai-assistant')).toMatchObject({
      title: 'xOneAI',
      navigation: [
        { pathSegment: 'overview', title: 'AI助手' },
        { pathSegment: 'resources', title: '资源' },
        { pathSegment: 'memory', title: '记忆', placeholder: true },
      ],
    });
    expect(getAppDefinition('ai-assistant')?.pageComponent).toBeDefined();
    expect(getAppDefinition('document-summary')?.pageComponent).toBeUndefined();
  });

  it('exposes an unknown backend app instead of silently remapping it', () => {
    expect(getAppDefinition('missing-app')).toBeUndefined();
  });
});
