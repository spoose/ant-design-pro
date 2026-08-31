import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthCurrentUser, OrganizationAccess } from '@/services/auth';
import Home from './index';

const organization: OrganizationAccess = {
  organizationId: 'organization-1',
  organizationCode: 'ORG1',
  organizationName: '组织一',
  permissions: [],
  appCodes: ['file-review'],
  dataScopes: [],
  defaultDataScopeId: null,
};
const testState = vi.hoisted(() => ({
  organizationId: 'organization-1',
  initialState: {
    currentUser: {
      userId: 'user-1',
      username: 'user-1',
      name: '用户一',
      avatar: null,
      email: '',
      status: 'active',
      isSuperAdmin: false,
      platformPermissions: [],
      projectAppCodes: [],
      defaultOrganizationId: null,
      organizations: [] as OrganizationAccess[],
    } as AuthCurrentUser,
  },
}));
testState.initialState.currentUser.organizations = [organization];

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath,
    matchPath,
    useIntl: () => ({
      formatMessage: ({ defaultMessage }: { defaultMessage: string }) =>
        defaultMessage,
    }),
    useLocation: () => ({ pathname: '/workspace/org/organization-1/home' }),
    useModel: () => ({ initialState: testState.initialState }),
    useParams: () => ({ organizationId: testState.organizationId }),
  };
});

vi.mock('@/pages/workspace/overview/WorkspaceHomeModules', () => ({
  WorkspaceHomeModules: ({
    appCodes,
    appTitle,
    getAppPath,
  }: {
    appCodes: string[];
    appTitle: string;
    getAppPath: (appCode: string) => string;
  }) => (
    <div>
      modules:{appTitle}:{appCodes.join(',')}:{getAppPath('file-review')}
    </div>
  ),
}));

vi.mock('@/pages/workspace/platform/overview/PlatformWelcomeAvatar', () => ({
  PlatformWelcomeAvatar: () => <div>avatar</div>,
}));

vi.mock('@/pages/workspace/platform/overview/welcome', () => ({
  getPlatformWelcomeHeading: () => ({
    title: '欢迎回来',
    description: '统一首页',
  }),
}));

describe('Home', () => {
  beforeEach(() => {
    testState.organizationId = 'organization-1';
  });

  it('renders the shared home with Organization apps and paths', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
    expect(screen.getByText('组织一')).toBeVisible();
    expect(
      screen.getByText(
        'modules:组织应用:file-review:/workspace/org/organization-1/apps/file-review/overview',
      ),
    ).toBeVisible();
  });

  it('exposes an invalid Organization URL', () => {
    testState.organizationId = 'missing';
    render(<Home />);
    expect(screen.getByRole('alert')).toHaveTextContent('未找到当前组织');
  });
});
