import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildWorkspaceStorageKey,
  clearWorkspaceSession,
  readWorkspaceSession,
  writeWorkspaceSession,
} from './workspaceSession';
import { createWorkspaceTab, type WorkspaceState } from './workspaceState';

const scopeKey = 'organization:org-1';
const createState = (): WorkspaceState => ({
  tabs: [
    createWorkspaceTab({
      kind: 'home',
      title: '首页',
      url: '/workspace/org/organization-1/home',
    }),
    createWorkspaceTab({
      kind: 'app',
      appKey: 'file-review',
      title: '文件审查',
      url: '/workspace/org/organization-1/apps/file-review',
    }),
  ],
});

describe('workspaceSession', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('restores tabs and order for the same user and Scope', () => {
    const state = createState();

    writeWorkspaceSession('user-1', scopeKey, state);

    expect(readWorkspaceSession('user-1', scopeKey)).toEqual(state);
  });

  it('isolates snapshots by user and Scope with a versioned key', () => {
    writeWorkspaceSession('user-1', scopeKey, createState());

    expect(buildWorkspaceStorageKey('user:2', 'platform')).toBe(
      'workspace-tabs:v3:user%3A2:platform',
    );
    expect(readWorkspaceSession('user-1', 'organization:org-2')).toEqual({
      tabs: [],
    });
  });

  it('ignores the legacy activeTabId field because URL owns active state', () => {
    const state = createState();
    window.sessionStorage.setItem(
      buildWorkspaceStorageKey('user-1', scopeKey),
      JSON.stringify({ ...state, activeTabId: 'legacy-tab' }),
    );

    expect(readWorkspaceSession('user-1', scopeKey)).toEqual(state);
  });

  it('returns an empty state for broken JSON', () => {
    window.sessionStorage.setItem(
      buildWorkspaceStorageKey('user-1', scopeKey),
      '{broken',
    );

    expect(readWorkspaceSession('user-1', scopeKey)).toEqual({ tabs: [] });
  });

  it('clears one selected Scope snapshot', () => {
    writeWorkspaceSession('user-1', scopeKey, createState());

    clearWorkspaceSession('user-1', scopeKey);

    expect(readWorkspaceSession('user-1', scopeKey).tabs).toEqual([]);
  });
});
