import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all heavy dependencies before importing app
const mockReplace = vi.fn();
const mockHistory = {
  location: {
    pathname: '/welcome',
    search: '',
    hash: '',
  },
  replace: mockReplace,
};

const mockLoadAuthSession = vi.fn();
const mockClearAccessToken = vi.fn();
const mockClearAuthSessionMetadata = vi.fn();
const mockGetAccessToken = vi.fn();
const mockHandleAccessTokenFailure = vi.fn();

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath,
    history: mockHistory,
    Link: ({ children }: any) => children,
    matchPath,
  };
});

vi.mock('@/services/auth-session', () => ({
  loadAuthSession: mockLoadAuthSession,
}));

vi.mock('@/utils/authToken', () => ({
  clearAccessToken: mockClearAccessToken,
  getAccessToken: mockGetAccessToken,
}));

vi.mock('@/utils/authSessionMetadata', () => ({
  clearAuthSessionMetadata: mockClearAuthSessionMetadata,
}));

vi.mock('@/utils/authFailure', () => ({
  buildAccessTokenLoginPath: ({
    pathname,
    search,
    hash,
  }: {
    pathname: string;
    search: string;
    hash: string;
  }) =>
    `/user/login?redirect=${encodeURIComponent(`${pathname}${search}${hash}`)}`,
  handleAccessTokenFailure: mockHandleAccessTokenFailure,
}));

vi.mock('@/components', () => ({
  AvatarDropdown: () => null,
  DocLink: () => null,
  ErrorBoundary: ({ children }: any) => children,
  Footer: () => null,
  LangDropdown: () => null,
  OfflineBanner: () => null,
  VersionDropdown: () => null,
  WorkspaceTabsHeader: () => null,
}));

vi.mock('@ant-design/pro-components', () => ({
  SettingDrawer: () => null,
}));

vi.mock('@ant-design/icons', () => ({
  AppstoreOutlined: () => null,
  AuditOutlined: () => null,
  BarChartOutlined: () => null,
  CloudServerOutlined: () => null,
  DatabaseOutlined: () => null,
  DashboardOutlined: () => null,
  DesktopOutlined: () => null,
  FileDoneOutlined: () => null,
  FileSearchOutlined: () => null,
  FileTextOutlined: () => null,
  FolderOutlined: () => null,
  HistoryOutlined: () => null,
  HomeOutlined: () => null,
  InboxOutlined: () => null,
  LinkOutlined: () => null,
  OllamaFilled: () => null,
  RadarChartOutlined: () => null,
  RobotOutlined: () => null,
  SafetyCertificateOutlined: () => null,
  SearchOutlined: () => null,
  SettingOutlined: () => null,
  TeamOutlined: () => null,
  ThunderboltOutlined: () => null,
}));

vi.mock('./components/RightContent/OrganizationSwitch', () => ({
  OrganizationSwitch: () => null,
}));

vi.mock('./requestErrorConfig', () => ({
  errorConfig: {},
}));

vi.mock('../config/defaultSettings', () => ({
  default: { navTheme: 'light' },
}));

const createSession = (currentUser: Record<string, unknown>) => ({
  backend: 'legacy' as const,
  currentUser,
});

describe('app getInitialState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccessToken.mockReturnValue('existing-access-token');
    mockHandleAccessTokenFailure.mockReturnValue(false);
    mockHistory.location = {
      pathname: '/welcome',
      search: '',
      hash: '',
    };
  });

  it('should fetch currentUser when not on login page', async () => {
    const { getInitialState } = await import('./app');
    mockLoadAuthSession.mockResolvedValue(
      createSession({
        name: 'Test User',
        access: 'admin',
      }),
    );

    const state = await getInitialState();

    expect(mockLoadAuthSession).toHaveBeenCalledWith({
      skipErrorHandler: true,
    });
    expect(state.authSession).toEqual(
      createSession({ name: 'Test User', access: 'admin' }),
    );
    expect(state.currentUser).toEqual({
      name: 'Test User',
      access: 'admin',
    });
    expect(state.settingDrawerOpen).toBe(false);
    expect(state.fetchUserInfo).toBeDefined();
  });

  it('should delegate currentUser Token failure to the shared handler', async () => {
    const { getInitialState } = await import('./app');
    const error = {
      response: {
        status: 401,
        data: { errorCode: 'ACCESS_TOKEN_INVALID' },
      },
    };
    mockLoadAuthSession.mockRejectedValue(error);
    mockHandleAccessTokenFailure.mockReturnValue(true);

    const state = await getInitialState();

    expect(mockHandleAccessTokenFailure).toHaveBeenCalledWith(error);
    expect(state.currentUser).toBeUndefined();
  });

  it('should redirect before loading a protected page without a Token', async () => {
    const { getInitialState } = await import('./app');
    mockGetAccessToken.mockReturnValue(undefined);
    mockHistory.location = {
      pathname: '/workspace/platform/overview',
      search: '?tab=home',
      hash: '#top',
    };

    const state = await getInitialState();

    expect(mockLoadAuthSession).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(
      `/user/login?redirect=${encodeURIComponent(
        '/workspace/platform/overview?tab=home#top',
      )}`,
    );
    expect(state.currentUser).toBeUndefined();
  });

  it('should clear a stale XOne session when listOrgs returns 403', async () => {
    const { getInitialState } = await import('./app');
    mockHistory.location = {
      pathname: '/workspace/platform/overview',
      search: '',
      hash: '',
    };
    mockLoadAuthSession.mockRejectedValue({
      response: { status: 403 },
    });

    const state = await getInitialState();

    expect(mockClearAccessToken).toHaveBeenCalledOnce();
    expect(mockClearAuthSessionMetadata).toHaveBeenCalledOnce();
    expect(mockReplace).toHaveBeenCalledWith(
      `/user/login?redirect=${encodeURIComponent(
        '/workspace/platform/overview',
      )}`,
    );
    expect(state.currentUser).toBeUndefined();
  });

  it('should expose errors that are not Token failures', async () => {
    const { getInitialState } = await import('./app');
    const networkError = new Error('network unavailable');
    mockLoadAuthSession.mockRejectedValue(networkError);

    await expect(getInitialState()).rejects.toBe(networkError);

    expect(mockHandleAccessTokenFailure).toHaveBeenCalledWith(networkError);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('should not fetch currentUser on login page', async () => {
    const { getInitialState } = await import('./app');
    mockHistory.location = {
      pathname: '/user/login',
      search: '',
      hash: '',
    };

    const state = await getInitialState();

    expect(mockLoadAuthSession).not.toHaveBeenCalled();
    expect(state.currentUser).toBeUndefined();
    expect(state.fetchUserInfo).toBeDefined();
  });

  it('should authenticate the select entry page', async () => {
    const { getInitialState } = await import('./app');
    mockHistory.location = {
      pathname: '/user/select-entry',
      search: '',
      hash: '',
    };
    mockLoadAuthSession.mockResolvedValue(
      createSession({
        name: 'User without default organization',
        organizations: [],
      }),
    );

    const state = await getInitialState();

    expect(mockLoadAuthSession).toHaveBeenCalled();
    expect(state.currentUser).toEqual({
      name: 'User without default organization',
      organizations: [],
    });
    expect(state.fetchUserInfo).toBeDefined();
  });

  it('should include default settings in initial state', async () => {
    const { getInitialState } = await import('./app');
    mockLoadAuthSession.mockResolvedValue(
      createSession({ name: 'User', organizations: [] }),
    );

    const state = await getInitialState();

    expect(state.settings).toEqual({ navTheme: 'light' });
  });

  it('fetchUserInfo should return user data on success', async () => {
    const { getInitialState } = await import('./app');
    mockLoadAuthSession.mockResolvedValue(
      createSession({
        name: 'Fetched User',
        access: 'user',
        organizations: [],
      }),
    );

    const state = await getInitialState();

    const user = await state.fetchUserInfo?.();
    expect(user).toEqual({
      name: 'Fetched User',
      access: 'user',
      organizations: [],
    });
  });
});

describe('app layout guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccessToken.mockReturnValue(undefined);
    mockHistory.location = {
      pathname: '/welcome',
      search: '',
      hash: '',
    };
  });

  it('should redirect unauthenticated users to login', async () => {
    const { layout } = await import('./app');
    const runtimeLayout = layout({
      initialState: {},
      setInitialState: vi.fn(),
    } as any);

    runtimeLayout.onPageChange?.({
      location: mockHistory.location,
    } as any);

    expect(mockReplace).toHaveBeenCalledWith(
      `/user/login?redirect=${encodeURIComponent('/welcome')}`,
    );
  });

  it('should not require a duplicated active Organization state', async () => {
    const { layout } = await import('./app');
    mockHistory.location = {
      pathname: '/dashboard/analysis',
      search: '?tab=sales',
      hash: '#today',
    };
    const runtimeLayout = layout({
      initialState: {
        currentUser: {
          name: 'Fetched User',
          access: 'user',
        },
      },
      setInitialState: vi.fn(),
    } as any);

    runtimeLayout.onPageChange?.({
      location: mockHistory.location,
    } as any);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('should use the user name initial when no avatar URL is configured', async () => {
    const { layout } = await import('./app');
    const runtimeLayout = layout({
      initialState: {
        currentUser: {
          name: 'super adm',
          avatar: null,
        },
      },
      setInitialState: vi.fn(),
    } as any);

    expect(runtimeLayout.avatarProps).toMatchObject({
      src: undefined,
      title: 'super adm',
      children: 'S',
    });
  });

  it('should preserve a real avatar and keep a Chinese initial as fallback', async () => {
    const { layout } = await import('./app');
    const runtimeLayout = layout({
      initialState: {
        currentUser: {
          name: '张三',
          avatar: 'https://example.test/avatar.png',
        },
      },
      setInitialState: vi.fn(),
    } as any);

    expect(runtimeLayout.avatarProps).toMatchObject({
      src: 'https://example.test/avatar.png',
      title: '张三',
      children: '张',
    });
  });

  it('should not bounce the first post-login navigation while currentUser is committing', async () => {
    const { layout } = await import('./app');
    mockGetAccessToken.mockReturnValue('new-access-token');
    mockHistory.location = {
      pathname: '/workspace/platform/overview',
      search: '',
      hash: '',
    };
    const runtimeLayout = layout({
      // 复现第一次登录：Token 已保存，但 Layout 闭包仍持有提交前的空用户态。
      initialState: {},
      setInitialState: vi.fn(),
    } as any);

    runtimeLayout.onPageChange?.({
      location: mockHistory.location,
    } as any);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('should not redirect authenticated users', async () => {
    const { layout } = await import('./app');
    const runtimeLayout = layout({
      initialState: {
        currentUser: {
          name: 'Fetched User',
          access: 'user',
        },
      },
      setInitialState: vi.fn(),
    } as any);

    runtimeLayout.onPageChange?.({
      location: mockHistory.location,
    } as any);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('should render the fixed Platform menu for a Super Admin workspace URL', async () => {
    const { layout } = await import('./app');
    mockHistory.location = {
      pathname: '/workspace/platform/organizations',
      search: '',
      hash: '',
    };
    const runtimeLayout = layout({
      initialState: {
        currentUser: {
          userId: 'super-admin',
          platformPermissions: ['platform:organization:update'],
          projectAppCodes: [],
          organizations: [],
        },
      },
      setInitialState: vi.fn(),
    } as any);

    expect(runtimeLayout.menuDataRender?.([]).map((item) => item.path)).toEqual(
      [
        '/workspace/platform/overview',
        '/workspace/platform/stats',
        '/workspace/platform/system',
      ],
    );
  });

  it('should keep the Platform home menu with nested pAI on assistant URLs', async () => {
    const { layout } = await import('./app');
    mockHistory.location = {
      pathname: '/workspace/platform/apps/ai-assistant/overview',
      search: '',
      hash: '',
    };
    const runtimeLayout = layout({
      initialState: {
        currentUser: {
          userId: 'super-admin',
          platformPermissions: ['platform:organization:update'],
          projectAppCodes: ['ai-assistant'],
          organizations: [],
        },
      },
      setInitialState: vi.fn(),
    } as any);

    const menuItems = runtimeLayout.menuDataRender?.([]) ?? [];
    expect(menuItems.map((item) => item.path)).toEqual([
      '/workspace/platform/overview',
      '/workspace/platform/apps/ai-assistant',
      '/workspace/platform/stats',
      '/workspace/platform/system',
    ]);
    expect(
      menuItems
        .find((item) => item.name === 'xOneAI')
        ?.children?.map((child) => child.path),
    ).toEqual([
      '/workspace/platform/apps/ai-assistant/overview',
      '/workspace/platform/apps/ai-assistant/resources',
      '/workspace/platform/apps/ai-assistant/memory',
    ]);
  });

  it('should not redirect on user public pages', async () => {
    const { layout } = await import('./app');
    const runtimeLayout = layout({
      initialState: {},
      setInitialState: vi.fn(),
    } as any);

    mockHistory.location = {
      pathname: '/user/login',
      search: '',
      hash: '',
    };
    runtimeLayout.onPageChange?.({
      location: mockHistory.location,
    } as any);

    mockHistory.location = {
      pathname: '/user/select-entry',
      search: '',
      hash: '',
    };
    runtimeLayout.onPageChange?.({
      location: mockHistory.location,
    } as any);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('should hide the ProLayout sider on account routes', async () => {
    const { layout } = await import('./app');
    mockHistory.location = {
      pathname: '/account/settings',
      search: '',
      hash: '',
    };
    const runtimeLayout = layout({
      initialState: {
        currentUser: {
          name: 'Demo User',
        },
        settings: {
          layout: 'mix',
          siderWidth: 248,
        },
      },
      setInitialState: vi.fn(),
    } as any);

    expect(runtimeLayout.menuRender).toBe(false);
  });
});
