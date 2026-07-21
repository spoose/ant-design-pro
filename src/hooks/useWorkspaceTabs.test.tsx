import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { writeWorkspaceSession } from '@/utils/workspaceSession';
import { createWorkspaceTab } from '@/utils/workspaceState';
import { useWorkspaceTabs } from './useWorkspaceTabs';

const testNavigate = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({
  useNavigate: () => testNavigate,
}));

const scopeKey = 'organization:organization-1';
const homeTab = {
  kind: 'home' as const,
  title: '首页',
  url: '/workspace/org/organization-1/home',
};
const appTab = createWorkspaceTab({
  kind: 'app',
  appKey: 'file-review',
  title: '文件审查',
  url: '/workspace/org/organization-1/apps/file-review',
});

describe('useWorkspaceTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('injects the fixed home first and restores App tabs for the current Scope', () => {
    writeWorkspaceSession('user-1', scopeKey, { tabs: [appTab] });

    const { result } = renderHook(() =>
      useWorkspaceTabs('user-1', scopeKey, appTab.id, homeTab),
    );

    expect(result.current.tabs.map((tab) => tab.id)).toEqual([
      'home',
      'app:file-review',
    ]);
  });

  it('reuses an App tab and persists its latest URL', async () => {
    const { result } = renderHook(() =>
      useWorkspaceTabs('user-1', scopeKey, appTab.id, homeTab),
    );

    act(() => {
      result.current.upsertRouteTab(appTab);
      result.current.upsertRouteTab({
        ...appTab,
        title: '待审文件',
        url: `${appTab.url}?status=pending`,
      });
    });

    expect(result.current.tabs).toHaveLength(2);
    expect(result.current.tabs[1]).toMatchObject({
      id: 'app:file-review',
      title: '待审文件',
    });
    await waitFor(() => {
      expect(
        window.sessionStorage.getItem(
          'workspace-tabs:v3:user-1:organization:organization-1',
        ),
      ).toContain('status=pending');
    });
  });

  it('navigates to the adjacent tab after closing the active App', () => {
    const { result } = renderHook(() =>
      useWorkspaceTabs('user-1', scopeKey, appTab.id, homeTab),
    );
    act(() => result.current.upsertRouteTab(appTab));
    act(() => result.current.closeTab(appTab.id));

    expect(result.current.tabs.map((tab) => tab.id)).toEqual(['home']);
    expect(testNavigate).toHaveBeenLastCalledWith(homeTab.url, {
      replace: true,
    });
  });

  it('uses Umi navigation when an existing tab is activated', () => {
    writeWorkspaceSession('user-1', scopeKey, { tabs: [appTab] });
    const { result } = renderHook(() =>
      useWorkspaceTabs('user-1', scopeKey, 'home', homeTab),
    );

    act(() => result.current.activateTab(appTab.id));
    expect(testNavigate).toHaveBeenCalledWith(appTab.url);
  });
});
