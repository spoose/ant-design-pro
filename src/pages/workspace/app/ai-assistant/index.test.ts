import { describe, expect, it } from 'vitest';
import { createConversationTitle, isResponseUpdating } from '.';

describe('createConversationTitle', () => {
  it('normalizes whitespace and limits a conversation title', () => {
    expect(createConversationTitle('  检查   这段内容  ')).toBe(
      '检查 这段内容',
    );
    expect(createConversationTitle('一'.repeat(30))).toBe(
      `${'一'.repeat(24)}…`,
    );
  });

  it('stops rendering Think as loading after the SDK aborts a response', () => {
    expect(isResponseUpdating('updating')).toBe(true);
    expect(isResponseUpdating('abort')).toBe(false);
  });
});
