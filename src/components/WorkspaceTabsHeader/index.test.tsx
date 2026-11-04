import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthCurrentUser } from '@/services/auth';
import type { WorkspaceTab } from '@/utils/workspaceState';
import type { WorkspaceTabsBarProps } from '../WorkspaceTabsBar';
import WorkspaceTabsHeader from '.';

const testState = vi.hoisted(() => ({
  currentUser: undefined as AuthCurrentUser | undefined,
  pathname: '/workspace/platform/overview',
  tabs: [] as WorkspaceTab[],
  upsertRouteTab: vi.fn(),
  closeTab: vi.fn(),
  destroy: vi.fn<(name: string) => Promise<void>>(),
}));

vi.mock('@/utils/octopRuntime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/octopRuntime')>()),
  destroyOctopInstance: testState.destroy,
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
      pathname: testState.pathname,
      search: '',
      hash: '',
    }),
    useModel: () => ({ initialState: { currentUser: testState.currentUser } }),
  };
});

vi.mock('@/hooks/useWorkspaceTabs', () => ({
  useWorkspaceTabs: () => ({
    tabs: testState.tabs,
    activateTab: vi.fn(),
    closeTab: testState.closeTab,
    upsertRouteTab: testState.upsertRouteTab,
  }),
}));

vi.mock('../WorkspaceTabsBar', () => ({
  default: ({ tabs, onClose }: WorkspaceTabsBarProps) => (
    <nav aria-label="应用标签">
      {tabs.map((tab) => (
        <span key={tab.id}>
          {tab.title}
          {tab.kind === 'app' && (
            <button type="button" onClick={() => onClose(tab.id)}>
              关闭{tab.title}
            </button>
          )}
        </span>
      ))}
    </nav>
  ),
}));

describe('WorkspaceTabsHeader', () => {
  const user: AuthCurrentUser = {
    userId: 'workspace-user',
    username: 'workspace-user',
    name: 'Workspace User',
    avatar: null,
    email: 'user@example.test',
    status: 'active',
    isSuperAdmin: false,
    platformPermissions: [],
    projectAppCodes: ['octop', 'file-review'],
    defaultOrganizationId: null,
    organizations: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    testState.destroy.mockResolvedValue(undefined);
    testState.pathname = '/workspace/platform/overview';
    testState.currentUser = user;
    testState.tabs = [
      {
        id: 'home',
        kind: 'home',
        title: '工作台',
        url: '/workspace/platform/overview',
      },
      {
        id: 'app:octop',
        kind: 'app',
        appKey: 'octop',
        title: 'Octop',
        url: '/workspace/platform/apps/octop/overview',
      },
      {
        id: 'app:file-review',
        kind: 'app',
        appKey: 'file-review',
        title: '文件审查',
        url: '/workspace/platform/apps/file-review/overview',
      },
    ];
  });

  it('uses the backend userId field to render Workspace tabs', async () => {
    testState.currentUser = {
      userId: 'super-admin',
      username: 'super-admin',
      name: 'Super Admin',
      avatar: null,
      email: 'super-admin@example.test',
      status: 'active',
      isSuperAdmin: true,
      platformPermissions: [],
      projectAppCodes: [],
      defaultOrganizationId: null,
      organizations: [],
    } as AuthCurrentUser;

    render(<WorkspaceTabsHeader />);

    expect(screen.getByRole('navigation', { name: '应用标签' })).toBeVisible();
    expect(screen.getByText('工作台')).toBeVisible();
    await waitFor(() => {
      expect(testState.upsertRouteTab).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'home', title: '工作台' }),
      );
    });
  });

  it.each([
    '/workspace/platform/overview',
    '/workspace/platform/apps/octop/overview',
  ])('destroys Octop when its active or background tab closes from %s', (pathname) => {
    testState.pathname = pathname;
    render(<WorkspaceTabsHeader />);
    fireEvent.click(screen.getByRole('button', { name: '关闭Octop' }));
    expect(testState.destroy).toHaveBeenCalledExactlyOnceWith(
      'octop:workspace-user:platform',
    );
    expect(testState.closeTab).toHaveBeenCalledExactlyOnceWith('app:octop');
  });

  it('leaves other app closures to the existing tab controller', () => {
    render(<WorkspaceTabsHeader />);
    fireEvent.click(screen.getByRole('button', { name: '关闭文件审查' }));
    expect(testState.destroy).not.toHaveBeenCalled();
    expect(testState.closeTab).toHaveBeenCalledExactlyOnceWith(
      'app:file-review',
    );
  });

  it('uses the organization scope when closing a background Octop tab', () => {
    testState.pathname = '/workspace/org/org-1/home';
    testState.currentUser = {
      ...user,
      organizations: [
        {
          organizationId: 'org-1',
          organizationCode: 'ORG1',
          organizationName: '组织一',
          permissions: [],
          appCodes: ['octop'],
          dataScopes: [],
          defaultDataScopeId: null,
        },
      ],
    };
    render(<WorkspaceTabsHeader />);
    fireEvent.click(screen.getByRole('button', { name: '关闭Octop' }));
    expect(testState.destroy).toHaveBeenCalledExactlyOnceWith(
      'octop:workspace-user:organization:org-1',
    );
    expect(testState.closeTab).toHaveBeenCalledExactlyOnceWith('app:octop');
  });
});
