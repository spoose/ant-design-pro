import { describe, expect, it } from 'vitest';
import { resolveKnowledgeSearchPageKey } from '.';

describe('resolveKnowledgeSearchPageKey', () => {
  it('maps supported URL segments to Knowledge Search pages', () => {
    expect(resolveKnowledgeSearchPageKey('sources')).toBe('sources');
    expect(resolveKnowledgeSearchPageKey('history')).toBe('history');
  });

  it('uses the search workbench for overview and unknown paths', () => {
    expect(resolveKnowledgeSearchPageKey('overview')).toBe('overview');
    expect(resolveKnowledgeSearchPageKey(undefined)).toBe('overview');
    expect(resolveKnowledgeSearchPageKey('unknown')).toBe('overview');
  });
});
