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

vi.mock('@umijs/max', () => ({
  history: mockHistory,
  Link: ({ children }: any) => children,
}));

vi.mock('@/services/ant-design-pro/api', () => ({
  currentUser: mockQueryCurrentUser,
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
    mockQueryCurrentUser.mockRejectedValue(new Error('401 Unauthorized'));

    const state = await getInitialState();

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('/user/login?redirect='),
    );
    expect(state.currentUser).toBeUndefined();
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

  it('should not fetch currentUser on select entry page', async () => {
    const { getInitialState } = await import('./app');
    mockHistory.location = {
      pathname: '/user/select-entry',
      search: '',
      hash: '',
    };

    const state = await getInitialState();

    expect(mockQueryCurrentUser).not.toHaveBeenCalled();
    expect(state.currentUser).toBeUndefined();
    expect(state.selectedLoginEntry).toBeUndefined();
    expect(state.fetchUserInfo).toBeDefined();
  });

  it('should encode redirect path correctly on 401', async () => {
    const { getInitialState } = await import('./app');
    mockHistory.location = {
      pathname: '/admin/users',
      search: '?page=2',
      hash: '#section',
    };
    mockQueryCurrentUser.mockRejectedValue(new Error('401'));

    await getInitialState();

    expect(mockReplace).toHaveBeenCalledWith(
      `/user/login?redirect=${encodeURIComponent('/admin/users?page=2#section')}`,
    );
  });

  it('should include default settings in initial state', async () => {
    const { getInitialState } = await import('./app');
    mockQueryCurrentUser.mockResolvedValue({
      data: { name: 'User' },
    });

    const state = await getInitialState();

    expect(state.settings).toEqual({ navTheme: 'light' });
  });

  it('fetchUserInfo should return user data on success', async () => {
    const { getInitialState } = await import('./app');
    mockQueryCurrentUser.mockResolvedValue({
      data: { name: 'Fetched User', access: 'user' },
    });

    const state = await getInitialState();

    const user = await state.fetchUserInfo?.();
    expect(user).toEqual({ name: 'Fetched User', access: 'user' });
  });

  it('should include selectedLoginEntry from currentUser', async () => {
    const { getInitialState } = await import('./app');
    const currentLoginEntry = {
      id: 'new-system-department',
      name: '新业务部门',
      type: 'system',
      systemName: 'New System',
      entryUrl: 'https://b.domain1',
    };
    mockQueryCurrentUser.mockResolvedValue({
      data: {
        name: 'Fetched User',
        access: 'user',
        currentLoginEntry,
      },
    });

    const state = await getInitialState();

    expect(state.selectedLoginEntry).toEqual(currentLoginEntry);
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

  it('should redirect authenticated users without entry to select entry', async () => {
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

  it('should not redirect authenticated users with entry', async () => {
    const { layout } = await import('./app');
    const runtimeLayout = layout({
      initialState: {
        currentUser: {
          name: 'Fetched User',
          access: 'user',
        },
        selectedLoginEntry: {
          id: 'pro-product',
          name: '产品研发部',
          type: 'department',
          systemName: 'Ant Design Pro',
        },
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
