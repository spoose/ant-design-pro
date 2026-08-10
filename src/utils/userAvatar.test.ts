import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_AVATAR, resolveUserAvatarUrl } from './userAvatar';

describe('resolveUserAvatarUrl', () => {
  it('returns the user avatar when present', () => {
    expect(resolveUserAvatarUrl('https://example.com/a.png')).toBe(
      'https://example.com/a.png',
    );
  });

  it('falls back to the shared default avatar', () => {
    expect(resolveUserAvatarUrl(null)).toBe(DEFAULT_USER_AVATAR);
    expect(resolveUserAvatarUrl(undefined)).toBe(DEFAULT_USER_AVATAR);
    expect(resolveUserAvatarUrl('   ')).toBe(DEFAULT_USER_AVATAR);
  });
});
