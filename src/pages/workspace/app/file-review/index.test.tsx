import { describe, expect, it } from 'vitest';
import { resolveFileReviewPageKey } from '.';

describe('resolveFileReviewPageKey', () => {
  it('maps supported URL segments to File Review pages', () => {
    expect(resolveFileReviewPageKey('queue')).toBe('queue');
    expect(resolveFileReviewPageKey('history')).toBe('history');
  });

  it('uses the workbench for the App root and unknown paths', () => {
    expect(resolveFileReviewPageKey(undefined)).toBe('overview');
    expect(resolveFileReviewPageKey('unknown')).toBe('overview');
  });
});
