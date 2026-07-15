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
const mockRefreshAccessToken = vi.fn();
const mockClearAccessToken = vi.fn();
const mockResolveCurrentContextId = vi.fn();
const mockClearCurrentContextId = vi.fn();

vi.mock('@umijs/max', () => ({
  history: mockHistory,
  Link: ({ children }: any) => children,
}));

vi.mock('@/services/ant-design-pro/api', () => ({
  currentUser: mockQueryCurrentUser,
}));

vi.mock('@/services/auth', () => ({
  refreshAccessToken: mockRefreshAccessToken,
}));

vi.mock('@/utils/authToken', () => ({
  clearAccessToken: mockClearAccessToken,
}));

vi.mock('@/utils/currentContext', () => ({
  clearCurrentContextId: mockClearCurrentContextId,
  resolveCurrentContextId: mockResolveCurrentContextId,
}));

vi.mock('@/components', () => ({
  AvatarDropdown: () => null,
  DocLink: () => null,
  ErrorBoundary: ({ children }: any) => children,
  Footer: () => null,
  LangDropdown: () => null,
  OfflineBanner: () => null,
  VersionDropdown: () => null,
}));

vi.mock('@ant-design/pro-components', () => ({
  SettingDrawer: () => null,
}));

vi.mock('@ant-design/icons', () => ({
  LinkOutlined: () => null,
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
    mockResolveCurrentContextId.mockReturnValue(undefined);
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
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
    expect(mockClearAccessToken).toHaveBeenCalled();
    expect(mockClearCurrentContextId).toHaveBeenCalled();
    expect(state.currentUser).toBeUndefined();
  });

  it('should expose non-401 currentUser errors without clearing auth', async () => {
    const { getInitialState } = await import('./app');
    const networkError = new Error('network unavailable');
    mockQueryCurrentUser.mockRejectedValue(networkError);

    await expect(getInitialState()).rejects.toBe(networkError);

    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
    expect(mockClearAccessToken).not.toHaveBeenCalled();
    expect(mockClearCurrentContextId).not.toHaveBeenCalled();
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
      data: { name: 'User without default context', contexts: [] },
    });

    const state = await getInitialState();

    expect(mockQueryCurrentUser).toHaveBeenCalled();
    expect(state.currentUser).toEqual({
      name: 'User without default context',
      contexts: [],
    });
    expect(state.currentContextId).toBeUndefined();
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
      data: { name: 'User', contexts: [] },
    });

    const state = await getInitialState();

    expect(state.settings).toEqual({ navTheme: 'light' });
  });

  it('fetchUserInfo should return user data on success', async () => {
    const { getInitialState } = await import('./app');
    mockQueryCurrentUser.mockResolvedValue({
      data: { name: 'Fetched User', access: 'user', contexts: [] },
    });

    const state = await getInitialState();

    const user = await state.fetchUserInfo?.();
    expect(user).toEqual({
      name: 'Fetched User',
      access: 'user',
      contexts: [],
    });
  });

  it('should initialize currentContextId from the default context', async () => {
    const { getInitialState } = await import('./app');
    const defaultContext = {
      id: 'ctx-s2',
      systemId: 'system-2',
      systemCode: 'SYS2',
      systemName: 'System 2',
      scopeType: 'system',
      permissions: ['page:home'],
    };
    mockResolveCurrentContextId.mockReturnValue(defaultContext.id);
    mockQueryCurrentUser.mockResolvedValue({
      data: {
        name: 'Fetched User',
        access: 'user',
        contexts: [defaultContext],
        defaultContextId: defaultContext.id,
      },
    });

    const state = await getInitialState();

    expect(mockResolveCurrentContextId).toHaveBeenCalledWith(
      [defaultContext],
      defaultContext.id,
    );
    expect(state.currentContextId).toBe(defaultContext.id);
  });

  it('should use the context resolved for the current tab', async () => {
    const { getInitialState } = await import('./app');
    const defaultContext = {
      id: 'default-entry',
      systemId: 'default-system',
      systemCode: 'DEFAULT',
      systemName: 'Default System',
      scopeType: 'department',
      permissions: ['page:home'],
    };
    const storedContext = {
      id: 'stored-entry',
      systemId: 'stored-system',
      systemCode: 'STORED',
      systemName: 'Stored System',
      scopeType: 'system',
      permissions: ['page:home'],
    };
    mockResolveCurrentContextId.mockReturnValue(storedContext.id);
    mockQueryCurrentUser.mockResolvedValue({
      data: {
        name: 'Fetched User',
        contexts: [defaultContext, storedContext],
        defaultContextId: defaultContext.id,
      },
    });

    const state = await getInitialState();

    expect(state.currentContextId).toBe(storedContext.id);
  });
});

describe('app layout guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('should redirect authenticated users without context to select entry', async () => {
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

    expect(mockReplace).toHaveBeenCalledWith(
      `/user/select-entry?redirect=${encodeURIComponent('/dashboard/analysis?tab=sales#today')}`,
    );
  });

  it('should not redirect authenticated users with context', async () => {
    const { layout } = await import('./app');
    const runtimeLayout = layout({
      initialState: {
        currentUser: {
          name: 'Fetched User',
          access: 'user',
        },
        currentContextId: 'ctx-s1-g1',
      },
      setInitialState: vi.fn(),
    } as any);

    runtimeLayout.onPageChange?.({
      location: mockHistory.location,
    } as any);

    expect(mockReplace).not.toHaveBeenCalled();
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
