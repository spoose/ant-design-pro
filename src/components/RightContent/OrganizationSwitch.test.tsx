import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthCurrentUser } from '@/services/auth';
import { OrganizationSwitch } from './OrganizationSwitch';

const historyPushMock = vi.hoisted(() => vi.fn());
const switchOrganizationMock = vi.hoisted(() => vi.fn());
const setInitialStateMock = vi.hoisted(() => vi.fn());
const messageSuccessMock = vi.hoisted(() => vi.fn());
const notificationDestroyMock = vi.hoisted(() => vi.fn());
const notificationErrorMock = vi.hoisted(() => vi.fn());

const testState = vi.hoisted(() => ({
  pathname: '/workspace/platform/overview',
  currentUser: undefined as AuthCurrentUser | undefined,
}));

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath,
    history: { push: historyPushMock },
    matchPath,
    useLocation: () => ({ pathname: testState.pathname }),
    useModel: () => ({
      initialState: { currentUser: testState.currentUser },
      setInitialState: setInitialStateMock,
    }),
  };
});

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    App: {
      ...actual.App,
      useApp: () => ({
        message: { success: messageSuccessMock },
        notification: {
          destroy: notificationDestroyMock,
          error: notificationErrorMock,
        },
      }),
    },
  };
});

vi.mock('@/services/auth-session', () => ({
  switchAuthSessionOrganization: switchOrganizationMock,
}));

vi.mock('../HeaderDropdown', () => ({
  default: ({ children, menu }: any) => (
    <div>
      {children}
      {menu.items.map((item: any) =>
        item.type === 'divider' ? (
          <hr key="project-management-divider" />
        ) : (
          <button
            type="button"
            disabled={item.disabled}
            key={item.key}
            onClick={() => menu.onClick({ key: item.key })}
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  ),
}));

const currentUser = {
  userId: 'user-1',
  username: 'user-1',
  name: '用户一',
  avatar: null,
  email: 'user-1@example.test',
  status: 'active',
  isSuperAdmin: false,
  platformPermissions: [],
  projectAppCodes: [],
  defaultOrganizationId: null,
  organizations: [
    {
      organizationId: 'organization-1',
      organizationCode: 'ORG1',
      organizationName: '组织一',
      permissions: [],
      appCodes: [],
      dataScopes: [],
      defaultDataScopeId: null,
    },
  ],
} as AuthCurrentUser;

const projectAdmin = {
  ...currentUser,
  isSuperAdmin: true,
  platformPermissions: ['*'],
} as AuthCurrentUser;

describe('OrganizationSwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.currentUser = currentUser;
    testState.pathname = '/workspace/platform/overview';
  });

  it('hides Project management from regular users', () => {
    render(<OrganizationSwitch />);
    expect(
      screen.getByRole('button', { name: '切换工作区，当前为工作台' }),
    ).toBeVisible();
    expect(screen.getByText('组织一')).toBeVisible();
    expect(screen.queryByText('项目控制台')).not.toBeInTheDocument();
  });

  it('derives the current Organization label from the URL', () => {
    testState.pathname = '/workspace/org/organization-1/home';
    render(<OrganizationSwitch />);
    expect(
      screen.getByRole('button', { name: '切换工作区，当前为组织一' }),
    ).toBeVisible();
  });

  it('switches the session before entering an Organization workspace', async () => {
    const switchedSession = {
      backend: 'xone' as const,
      projectId: '1111',
      activeOrganizationId: 'organization-1',
      currentUser,
    };
    switchOrganizationMock.mockResolvedValue(switchedSession);

    render(<OrganizationSwitch />);
    fireEvent.click(screen.getByRole('button', { name: '组织一' }));

    await waitFor(() => {
      expect(switchOrganizationMock).toHaveBeenCalledWith('organization-1', {
        skipErrorHandler: true,
      });
    });
    expect(setInitialStateMock).toHaveBeenCalledOnce();
    const updateState = setInitialStateMock.mock.calls[0]?.[0];
    expect(updateState({ settings: {} })).toEqual({
      settings: {},
      authSession: switchedSession,
      currentUser,
    });
    expect(messageSuccessMock).toHaveBeenCalledWith('已切换至组织一');
  });

  it('enters Project management without switching the Organization Token', () => {
    testState.currentUser = projectAdmin;
    testState.pathname = '/workspace/org/organization-1/home';

    render(<OrganizationSwitch />);
    fireEvent.click(screen.getByRole('button', { name: '项目控制台' }));

    expect(historyPushMock).toHaveBeenCalledWith(
      '/workspace/platform/overview',
    );
    expect(switchOrganizationMock).not.toHaveBeenCalled();
    expect(setInitialStateMock).not.toHaveBeenCalled();
  });

  it('keeps the current workspace and reports a switch failure', async () => {
    switchOrganizationMock.mockRejectedValue(new Error('Token 组织不一致'));

    render(<OrganizationSwitch />);
    fireEvent.click(screen.getByRole('button', { name: '组织一' }));

    await waitFor(() => {
      expect(notificationErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '切换组织失败',
          description: 'Token 组织不一致',
        }),
      );
    });
    expect(setInitialStateMock).not.toHaveBeenCalled();
    expect(historyPushMock).not.toHaveBeenCalled();
  });
});
