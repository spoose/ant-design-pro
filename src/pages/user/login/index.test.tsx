import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testMocks = vi.hoisted(() => ({
  loginAuthSession: vi.fn(),
  onFinish: undefined as
    | ((values: Record<string, unknown>) => Promise<void>)
    | undefined,
  replace: vi.fn(),
  setInitialState: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@umijs/max', async () => {
  const React = await import('react');
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) =>
      React.createElement(React.Fragment, null, defaultMessage),
    Helmet: () => null,
    SelectLang: () => null,
    generatePath,
    history: { push: vi.fn(), replace: testMocks.replace },
    matchPath,
    useIntl: () => ({
      formatMessage: ({ defaultMessage }: { defaultMessage: string }) =>
        defaultMessage,
    }),
    useModel: () => ({ setInitialState: testMocks.setInitialState }),
    useSearchParams: () => [new URLSearchParams()],
  };
});

vi.mock('@ant-design/pro-components', async () => {
  const React = await import('react');
  const TextField = ({
    name,
    placeholder,
  }: {
    name?: string;
    placeholder?: string;
  }) => React.createElement('input', { name, placeholder });
  return {
    LoginForm: ({
      children,
      onFinish,
    }: {
      children: React.ReactNode;
      onFinish: (values: Record<string, unknown>) => Promise<void>;
    }) => {
      testMocks.onFinish = onFinish;
      return React.createElement('form', null, children);
    },
    ProFormCaptcha: TextField,
    ProFormCheckbox: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    ProFormText: Object.assign(TextField, { Password: TextField }),
  };
});

vi.mock('antd', async () => {
  const React = await import('react');
  const Container = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children);
  return {
    App: {
      useApp: () => ({
        message: { success: testMocks.success },
        notification: { destroy: vi.fn() },
      }),
    },
    Button: Container,
    Carousel: Container,
    Tabs: Container,
  };
});

vi.mock('antd-style', () => ({
  createStyles: () => () => ({
    styles: new Proxy({}, { get: (_, property) => String(property) }),
  }),
}));

vi.mock('@ant-design/icons', () => ({
  LockOutlined: () => null,
  MobileOutlined: () => null,
  UserOutlined: () => null,
}));

vi.mock('@/components', () => ({ Footer: () => null }));
vi.mock('@/services/ant-design-pro/login', () => ({
  getFakeCaptcha: vi.fn(),
}));
vi.mock('@/services/auth', () => ({
  getAuthErrorDetails: (error: Error) => ({ message: error.message }),
}));
vi.mock('@/services/auth-backends', () => ({
  getConfiguredAuthBackendKind: () => 'xone',
}));
vi.mock('@/services/auth-session', () => ({
  loginAuthSession: testMocks.loginAuthSession,
}));
vi.mock('../authNotification', () => ({
  showAuthErrorNotification: vi.fn(),
}));

import Login from './index';

describe('XOne login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testMocks.onFinish = undefined;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
  });

  it('submits the fixed XOne projectId without exposing a Project input', async () => {
    const currentUser = {
      userId: '1',
      username: 'xone-user',
      name: 'xone-user',
      defaultOrganizationId: '1',
      platformPermissions: [],
      projectAppCodes: [],
      organizations: [
        {
          organizationId: '1',
          organizationCode: 'org001',
          organizationName: '组织一',
          permissions: ['*'],
          appCodes: [],
          dataScopes: [],
          defaultDataScopeId: '1',
        },
      ],
    };
    const session = {
      backend: 'xone',
      projectId: '1111',
      activeOrganizationId: '1',
      currentUser,
    };
    testMocks.loginAuthSession.mockResolvedValue(session);

    render(React.createElement(Login));

    expect(
      screen.queryByPlaceholderText('项目 ID，例如 1111'),
    ).not.toBeInTheDocument();
    await act(async () => {
      await testMocks.onFinish?.({
        username: 'xone-user',
        password: 'secret',
      });
    });

    expect(testMocks.loginAuthSession).toHaveBeenCalledWith(
      {
        projectId: 1111,
        authType: 'password',
        username: 'xone-user',
        password: 'secret',
      },
      { skipErrorHandler: true },
    );
    const updateInitialState = testMocks.setInitialState.mock.calls[0]?.[0];
    expect(updateInitialState({ settings: {} })).toEqual({
      settings: {},
      authSession: session,
      currentUser,
    });
    expect(testMocks.replace).toHaveBeenCalledWith(
      '/workspace/platform/overview',
    );
  });
});
