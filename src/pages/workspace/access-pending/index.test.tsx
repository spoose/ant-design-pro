import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthCurrentUser } from '@/services/auth';
import { getAccessToken, setAccessToken } from '@/utils/authToken';
import AccessPendingPage from '.';

const pendingPageTestState = vi.hoisted(() => ({
  initialState: undefined as
    | {
        currentUser: AuthCurrentUser;
        fetchUserInfo: () => Promise<AuthCurrentUser | undefined>;
      }
    | undefined,
  historyReplace: vi.fn(),
  logout: vi.fn(),
  setInitialState: vi.fn(),
}));

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath,
    matchPath,
    Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Navigate: ({ to }: { to: string }) => (
      <div data-testid="pending-redirect">{to}</div>
    ),
    history: { replace: pendingPageTestState.historyReplace },
    useModel: () => ({
      initialState: pendingPageTestState.initialState,
      setInitialState: pendingPageTestState.setInitialState,
    }),
  };
});

vi.mock('@/services/auth', async () => {
  const actual =
    await vi.importActual<typeof import('@/services/auth')>('@/services/auth');
  return { ...actual, logout: pendingPageTestState.logout };
});

const createUser = (
  overrides: Partial<AuthCurrentUser> = {},
): AuthCurrentUser =>
  ({
    userId: 'pending-user',
    username: 'pending.user',
    name: '等待授权用户',
    email: 'pending@example.test',
    platformPermissions: [],
    platformSkillCodes: [],
    defaultOrganizationId: null,
    organizations: [],
    ...overrides,
  }) as AuthCurrentUser;

const renderPage = () =>
  render(
    <App>
      <AccessPendingPage />
    </App>,
  );

describe('AccessPendingPage', () => {
  beforeEach(() => {
    localStorage.clear();
    pendingPageTestState.historyReplace.mockReset();
    pendingPageTestState.logout.mockReset();
    pendingPageTestState.logout.mockResolvedValue({
      success: true,
      data: { loggedOut: true, serverTokenRevoked: false },
      traceId: 'trace-logout',
    });
    pendingPageTestState.setInitialState.mockReset();
    pendingPageTestState.initialState = {
      currentUser: createUser(),
      fetchUserInfo: vi.fn().mockResolvedValue(createUser()),
    };
  });

  it('refreshes currentUser and enters the first authorized Organization', async () => {
    const authorizedUser = createUser({
      organizations: [
        {
          organizationId: 'organization-1',
          organizationCode: 'ORG1',
          organizationName: '组织一',
          permissions: [],
          skillCodes: [],
          dataScopes: [],
        },
      ],
    });
    pendingPageTestState.initialState = {
      currentUser: createUser(),
      fetchUserInfo: vi.fn().mockResolvedValue(authorizedUser),
    };

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '刷新访问权限' }));

    await waitFor(() => {
      expect(pendingPageTestState.historyReplace).toHaveBeenCalledWith(
        '/workspace/org/organization-1/home',
      );
    });
    expect(pendingPageTestState.setInitialState).toHaveBeenCalledOnce();
  });

  it('redirects a user who already has access away from the pending page', () => {
    pendingPageTestState.initialState = {
      currentUser: createUser({
        platformPermissions: ['platform:user:manage'],
      }),
      fetchUserInfo: vi.fn(),
    };

    renderPage();
    expect(screen.getByTestId('pending-redirect')).toHaveTextContent(
      '/workspace/platform/overview',
    );
  });

  it('clears the local login state even when logout acknowledgement fails', async () => {
    setAccessToken('pending-access-token');
    pendingPageTestState.logout.mockRejectedValue(new Error('offline'));

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '退出登录' }));

    await waitFor(() => {
      expect(pendingPageTestState.historyReplace).toHaveBeenCalledWith(
        '/user/login',
      );
    });
    expect(getAccessToken()).toBeUndefined();
    expect(pendingPageTestState.logout).toHaveBeenCalledWith({
      skipErrorHandler: true,
    });
    expect(pendingPageTestState.setInitialState).toHaveBeenCalledOnce();
  });
});
