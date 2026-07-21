import { describe, expect, it } from 'vitest';
import {
  buildWorkspaceScopeKey,
  buildWorkspaceTabId,
  createEmptyWorkspaceState,
  createWorkspaceTab,
  getOrganizationBadge,
} from './workspaceState';

describe('workspaceState', () => {
  it('creates the fixed home and reusable App tabs', () => {
    const homeTab = createWorkspaceTab({
      kind: 'home',
      title: '首页',
      url: '/workspace/org/organization-1/home',
    });
    const appTab = createWorkspaceTab({
      kind: 'app',
      appKey: 'file-review',
      title: '文件审查',
      url: '/workspace/org/organization-1/apps/file-review',
    });

    expect(homeTab.id).toBe('home');
    expect(appTab.id).toBe('app:file-review');
    expect(buildWorkspaceTabId(appTab)).toBe('app:file-review');
  });

  it('isolates the same App through the Scope storage key', () => {
    expect(buildWorkspaceScopeKey({ kind: 'platform' })).toBe('platform');
    expect(
      buildWorkspaceScopeKey({
        kind: 'organization',
        organizationId: 'org/a',
      }),
    ).toBe('organization:org%2Fa');
  });

  it('returns a new empty state for each Workspace mount', () => {
    const firstState = createEmptyWorkspaceState();
    const secondState = createEmptyWorkspaceState();

    expect(firstState).toEqual({ tabs: [] });
    expect(firstState.tabs).not.toBe(secondState.tabs);
  });

  it('builds the compact organization badge used by the sidebar', () => {
    expect(getOrganizationBadge('ORG1')).toBe('OR');
    expect(getOrganizationBadge('data')).toBe('DA');
  });
});
