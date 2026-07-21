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

const mockQueryCurrentUser = vi.fn();
const mockClearAccessToken = vi.fn();
const mockGetAccessToken = vi.fn();

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

vi.mock('@/services/ant-design-pro/api', () => ({
  currentUser: mockQueryCurrentUser,
}));

vi.mock('@/utils/authToken', () => ({
  clearAccessToken: mockClearAccessToken,
  getAccessToken: mockGetAccessToken,
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
  DatabaseOutlined: () => null,
  DashboardOutlined: () => null,
  FileDoneOutlined: () => null,
  FileSearchOutlined: () => null,
  FileTextOutlined: () => null,
  HistoryOutlined: () => null,
  HomeOutlined: () => null,
  InboxOutlined: () => null,
  LinkOutlined: () => null,
  SafetyCertificateOutlined: () => null,
  SearchOutlined: () => null,
  SettingOutlined: () => null,
  TeamOutlined: () => null,
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

describe('app getInitialState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHistory.location = {
      pathname: '/welcome',
      search: '',
      hash: '',
    };
  });

  it('should fetch currentUser when not on login page', async () => {
    const { getInitialState } = await import('./app');
    mockQueryCurrentUser.mockResolvedValue({
      data: {
        name: 'Test User',
        access: 'admin',
      },
    });

    const state = await getInitialState();

    expect(mockQueryCurrentUser).toHaveBeenCalled();
    expect(state.currentUser).toEqual({
      name: 'Test User',
      access: 'admin',
    });
    expect(state.settingDrawerOpen).toBe(false);
    expect(state.fetchUserInfo).toBeDefined();
  });

  it('should redirect to login when currentUser fetch fails (401)', async () => {
    const { getInitialState } = await import('./app');
    mockQueryCurrentUser.mockRejectedValue({ response: { status: 401 } });

    const state = await getInitialState();

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('/user/login?redirect='),
    );
    expect(mockClearAccessToken).toHaveBeenCalled();
    expect(state.currentUser).toBeUndefined();
  });

  it('should expose non-401 currentUser errors without clearing auth', async () => {
    const { getInitialState } = await import('./app');
    const networkError = new Error('network unavailable');
    mockQueryCurrentUser.mockRejectedValue(networkError);

    await expect(getInitialState()).rejects.toBe(networkError);

    expect(mockClearAccessToken).not.toHaveBeenCalled();
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

    expect(mockQueryCurrentUser).not.toHaveBeenCalled();
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
    mockQueryCurrentUser.mockResolvedValue({
      data: { name: 'User without default organization', organizations: [] },
    });

    const state = await getInitialState();

    expect(mockQueryCurrentUser).toHaveBeenCalled();
    expect(state.currentUser).toEqual({
      name: 'User without default organization',
      organizations: [],
    });
    expect(state.fetchUserInfo).toBeDefined();
  });

  it('should encode redirect path correctly on 401', async () => {
    const { getInitialState } = await import('./app');
    mockHistory.location = {
      pathname: '/admin/users',
      search: '?page=2',
      hash: '#section',
    };
    mockQueryCurrentUser.mockRejectedValue({ response: { status: 401 } });

    await getInitialState();

    expect(mockReplace).toHaveBeenCalledWith(
      `/user/login?redirect=${encodeURIComponent('/admin/users?page=2#section')}`,
    );
  });

  it('should include default settings in initial state', async () => {
    const { getInitialState } = await import('./app');
    mockQueryCurrentUser.mockResolvedValue({
      data: { name: 'User', organizations: [] },
    });

    const state = await getInitialState();

    expect(state.settings).toEqual({ navTheme: 'light' });
  });

  it('fetchUserInfo should return user data on success', async () => {
    const { getInitialState } = await import('./app');
    mockQueryCurrentUser.mockResolvedValue({
      data: { name: 'Fetched User', access: 'user', organizations: [] },
    });

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
          userid: 'super-admin',
          platformPermissions: ['platform:organization:update'],
          platformSkillCodes: [],
          organizations: [],
        },
      },
      setInitialState: vi.fn(),
    } as any);

    expect(runtimeLayout.menuDataRender?.([]).map((item) => item.path)).toEqual(
      ['/workspace/platform/overview', '/workspace/platform/organizations'],
    );
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
});
