import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthCurrentUser, AuthSession } from '@/services/auth';
import { OCTOP_STATUS_EVENT } from '@/utils/octopBridge';
import OctopRuntimeBoundary from '.';

const state = vi.hoisted(() => ({
  pathname: '/workspace/platform/apps/octop/overview',
  user: undefined as AuthCurrentUser | undefined,
  session: undefined as AuthSession | undefined,
  destroy: vi.fn<(name: string) => Promise<void>>(),
  preload: vi.fn(),
  emit: vi.fn(),
}));

vi.mock('wujie-react', () => ({
  default: { preloadApp: state.preload, bus: { $emit: state.emit } },
}));

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath,
    matchPath,
    useLocation: () => ({ pathname: state.pathname }),
    useModel: () => ({
      initialState: { currentUser: state.user, authSession: state.session },
    }),
  };
});
vi.mock('@/utils/octopRuntime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/octopRuntime')>()),
  destroyOctopInstance: state.destroy,
}));

const user: AuthCurrentUser = {
  userId: 'user-1',
  username: 'user-1',
  name: 'User',
  avatar: null,
  email: 'user@example.test',
  status: 'active',
  isSuperAdmin: false,
  platformPermissions: [],
  projectAppCodes: ['octop'],
  defaultOrganizationId: null,
  organizations: ['org-1', 'org-2'].map((organizationId) => ({
    organizationId,
    organizationCode: organizationId,
    organizationName: organizationId,
    permissions: [],
    appCodes: ['octop'],
    dataScopes: [],
    defaultDataScopeId: null,
  })),
};

beforeEach(() => {
  state.user = user;
  state.session = undefined;
  state.pathname = '/workspace/platform/apps/octop/overview';
  state.destroy.mockReset().mockResolvedValue(undefined);
  state.preload.mockReset();
  state.emit.mockReset();
});

describe('Octop host runtime boundary', () => {
  it('starts Octop on the home page and reuses the instance name of the assistant page', () => {
    state.pathname = '/workspace/platform/overview';
    const view = render(<OctopRuntimeBoundary />);
    expect(state.preload).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        name: 'octop:user-1:platform',
        url: 'http://localhost:5173/',
        alive: true,
        exec: true,
      }),
    );
    state.user = { ...user };
    view.rerender(<OctopRuntimeBoundary />);
    state.pathname = '/workspace/platform/apps/octop/overview';
    view.rerender(<OctopRuntimeBoundary />);
    expect(state.preload).toHaveBeenCalledTimes(1);
    expect(state.destroy).not.toHaveBeenCalled();
  });

  it('starts the current organization instance on its home page', () => {
    state.pathname = '/workspace/org/org-1/home';
    render(<OctopRuntimeBoundary />);
    expect(state.preload).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'octop:user-1:organization:org-1' }),
    );
  });

  it('reports startup and resource failure without treating a failure as logged out', () => {
    state.pathname = '/workspace/platform/overview';
    render(<OctopRuntimeBoundary />);
    const options = state.preload.mock.calls[0][0];
    options.beforeLoad(window);
    expect(state.emit).toHaveBeenLastCalledWith(OCTOP_STATUS_EVENT, {
      status: 'checking',
    });
    options.loadError(options.url, new Error('Network unavailable'));
    expect(state.emit).toHaveBeenLastCalledWith(OCTOP_STATUS_EVENT, {
      status: 'offline',
    });
  });

  it('does not start Octop automatically outside the home page', () => {
    render(<OctopRuntimeBoundary />);
    expect(state.preload).not.toHaveBeenCalled();
  });

  it('does not start Octop for an unauthenticated or unauthorized home page', () => {
    state.pathname = '/workspace/platform/overview';
    state.user = undefined;
    const view = render(<OctopRuntimeBoundary />);
    state.user = { ...user, projectAppCodes: [] };
    view.rerender(<OctopRuntimeBoundary />);
    expect(state.preload).not.toHaveBeenCalled();
  });

  it('keeps the instance across routes and session refreshes in the same scope', () => {
    const view = render(<OctopRuntimeBoundary />);
    state.pathname = '/workspace/platform/overview';
    state.user = { ...user };
    view.rerender(<OctopRuntimeBoundary />);
    state.pathname = '/workspace/platform/apps/file-review/overview';
    view.rerender(<OctopRuntimeBoundary />);
    expect(state.destroy).not.toHaveBeenCalled();
  });

  it('destroys the old user instance when the host user changes', () => {
    const view = render(<OctopRuntimeBoundary />);
    state.user = { ...user, userId: 'user-2' };
    view.rerender(<OctopRuntimeBoundary />);
    expect(state.destroy).toHaveBeenCalledExactlyOnceWith(
      'octop:user-1:platform',
    );
  });

  it('destroys the old scope when switching project and organization workspaces', () => {
    const view = render(<OctopRuntimeBoundary />);
    state.pathname = '/workspace/org/org-1/home';
    view.rerender(<OctopRuntimeBoundary />);
    expect(state.destroy).toHaveBeenLastCalledWith('octop:user-1:platform');
    state.pathname = '/workspace/org/org-2/home';
    view.rerender(<OctopRuntimeBoundary />);
    expect(state.destroy).toHaveBeenLastCalledWith(
      'octop:user-1:organization:org-1',
    );
    expect(state.destroy).toHaveBeenCalledTimes(2);
  });

  it('destroys the instance when the host logs out', () => {
    const view = render(<OctopRuntimeBoundary />);
    state.user = undefined;
    view.rerender(<OctopRuntimeBoundary />);
    expect(state.destroy).toHaveBeenCalledExactlyOnceWith(
      'octop:user-1:platform',
    );
  });

  it('destroys the background instance when project access is revoked', () => {
    state.pathname = '/workspace/platform/overview';
    const view = render(<OctopRuntimeBoundary />);
    state.user = { ...user, projectAppCodes: [] };
    view.rerender(<OctopRuntimeBoundary />);
    expect(state.destroy).toHaveBeenCalledExactlyOnceWith(
      'octop:user-1:platform',
    );
  });

  it('destroys the background instance when organization access is revoked', () => {
    state.pathname = '/workspace/org/org-1/home';
    const view = render(<OctopRuntimeBoundary />);
    state.user = {
      ...user,
      organizations: [{ ...user.organizations[0], appCodes: [] }],
    };
    view.rerender(<OctopRuntimeBoundary />);
    expect(state.destroy).toHaveBeenCalledExactlyOnceWith(
      'octop:user-1:organization:org-1',
    );
  });

  it('uses the existing XOne active organization rule', () => {
    state.pathname = '/workspace/org/org-1/home';
    state.session = {
      backend: 'xone',
      currentUser: user,
      activeOrganizationId: 'org-1',
    };
    const view = render(<OctopRuntimeBoundary />);
    state.session = { ...state.session, activeOrganizationId: 'org-2' };
    view.rerender(<OctopRuntimeBoundary />);
    expect(state.destroy).toHaveBeenCalledExactlyOnceWith(
      'octop:user-1:organization:org-1',
    );
  });

  it('releases the instance when leaving the workspace', () => {
    const view = render(<OctopRuntimeBoundary />);
    state.pathname = '/account/settings';
    view.rerender(<OctopRuntimeBoundary />);
    expect(state.destroy).toHaveBeenCalledExactlyOnceWith(
      'octop:user-1:platform',
    );
  });

  it('releases the instance when the host layout unmounts', () => {
    const view = render(<OctopRuntimeBoundary />);
    view.unmount();
    expect(state.destroy).toHaveBeenCalledExactlyOnceWith(
      'octop:user-1:platform',
    );
  });

  it('does not create a cleanup target for an unauthorized user', () => {
    state.user = { ...user, projectAppCodes: [] };
    const view = render(<OctopRuntimeBoundary />);
    view.unmount();
    expect(state.destroy).not.toHaveBeenCalled();
  });
});
