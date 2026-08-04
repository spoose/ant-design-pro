import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AuthCurrentUser } from '@/services/auth';
import WorkspaceTabsHeader from '.';

const testState = vi.hoisted(() => ({
  currentUser: undefined as AuthCurrentUser | undefined,
  upsertRouteTab: vi.fn(),
}));

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath,
    matchPath,
    useLocation: () => ({
      pathname: '/workspace/platform/overview',
      search: '',
      hash: '',
    }),
    useModel: () => ({ initialState: { currentUser: testState.currentUser } }),
  };
});

vi.mock('@/hooks/useWorkspaceTabs', () => ({
  useWorkspaceTabs: () => ({
    tabs: [
      {
        id: 'home',
        kind: 'home',
        title: '管理中心',
        url: '/workspace/platform/overview',
      },
    ],
    activateTab: vi.fn(),
    closeTab: vi.fn(),
    upsertRouteTab: testState.upsertRouteTab,
  }),
}));

vi.mock('../WorkspaceTabsBar', () => ({
  default: ({ tabs }: { tabs: Array<{ id: string; title: string }> }) => (
    <nav aria-label="应用标签">
      {tabs.map((tab) => (
        <span key={tab.id}>{tab.title}</span>
      ))}
    </nav>
  ),
}));

describe('WorkspaceTabsHeader', () => {
  it('uses the backend userId field to render Workspace tabs', async () => {
    testState.currentUser = {
      userId: 'super-admin',
      username: 'super-admin',
      name: 'Super Admin',
      avatar: null,
      email: 'super-admin@example.test',
      status: 'active',
      isSuperAdmin: true,
      platformPermissions: ['platform:user:manage'],
      platformSkillCodes: [],
      defaultOrganizationId: null,
      organizations: [],
    } as AuthCurrentUser;

    render(<WorkspaceTabsHeader />);

    expect(screen.getByRole('navigation', { name: '应用标签' })).toBeVisible();
    expect(screen.getByText('管理中心')).toBeVisible();
    await waitFor(() => {
      expect(testState.upsertRouteTab).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'home', title: '管理中心' }),
      );
    });
  });
});
