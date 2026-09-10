import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyWorkspaceBackground,
  normalizeWorkspaceBackground,
  readWorkspaceBackground,
  WORKSPACE_APPEARANCE_STORAGE_KEY,
  WORKSPACE_BACKGROUND_ATTRIBUTE,
  writeWorkspaceBackground,
} from './workspaceAppearance';

const attribute = () =>
  document.documentElement.getAttribute(WORKSPACE_BACKGROUND_ATTRIBUTE);

describe('workspaceAppearance', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute(WORKSPACE_BACKGROUND_ATTRIBUTE);
  });

  it('falls back to classic when nothing is stored', () => {
    expect(readWorkspaceBackground()).toBe('classic');
  });

  it('round-trips a stored preset', () => {
    writeWorkspaceBackground('cool');
    expect(window.localStorage.getItem(WORKSPACE_APPEARANCE_STORAGE_KEY)).toBe(
      'cool',
    );
    expect(readWorkspaceBackground()).toBe('cool');
  });

  it('ignores unknown or malformed stored values', () => {
    expect(normalizeWorkspaceBackground('warm')).toBe('classic');
    expect(normalizeWorkspaceBackground(undefined)).toBe('classic');
    expect(normalizeWorkspaceBackground(7)).toBe('classic');
    window.localStorage.setItem(WORKSPACE_APPEARANCE_STORAGE_KEY, 'warm');
    expect(readWorkspaceBackground()).toBe('classic');
  });

  it('marks the document for cool and clears it for classic', () => {
    applyWorkspaceBackground('cool');
    expect(attribute()).toBe('cool');
    applyWorkspaceBackground('classic');
    expect(attribute()).toBeNull();
  });
});
