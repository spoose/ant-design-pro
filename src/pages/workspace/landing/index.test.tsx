import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthCurrentUser } from '@/services/auth';
import WorkspaceLandingPage from '.';

// 模拟 getInitialState.currentUser，验证入口页真正消费权限规则而不是静态 /home。
const landingTestState = vi.hoisted(() => ({
  currentUser: undefined as AuthCurrentUser | undefined,
}));

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath,
    matchPath,
    Navigate: ({ replace, to }: { replace: boolean; to: string }) => (
      <div data-replace={String(replace)} data-testid="landing-target">
        {to}
      </div>
    ),
    useModel: () => ({ initialState: landingTestState }),
  };
});

const createLandingUser = (
  overrides: Partial<AuthCurrentUser>,
): AuthCurrentUser =>
  ({
    userId: 'landing-user',
    username: 'landing-user',
    name: 'Landing User',
    avatar: null,
    email: 'landing-user@example.test',
    status: 'active',
    isSuperAdmin: false,
    platformPermissions: [],
    projectAppCodes: [],
    defaultOrganizationId: null,
    organizations: [],
    ...overrides,
  }) as AuthCurrentUser;

describe('WorkspaceLandingPage', () => {
  beforeEach(() => {
    landingTestState.currentUser = undefined;
  });

  it('sends a Platform admin to the shared Project home', () => {
    landingTestState.currentUser = createLandingUser({
      platformPermissions: ['platform:user:manage'],
    });

    render(<WorkspaceLandingPage />);
    expect(screen.getByTestId('landing-target')).toHaveTextContent(
      '/workspace/platform/overview',
    );
  });

  it('sends a regular Organization user to the same Project home', () => {
    landingTestState.currentUser = createLandingUser({
      defaultOrganizationId: 'organization-1',
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
    });

    render(<WorkspaceLandingPage />);
    expect(screen.getByTestId('landing-target')).toHaveTextContent(
      '/workspace/platform/overview',
    );
  });

  it('keeps the Project home independent from the default Organization', () => {
    landingTestState.currentUser = createLandingUser({
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
        {
          organizationId: 'organization-2',
          organizationCode: 'ORG2',
          organizationName: '组织二',
          permissions: [],
          appCodes: [],
          dataScopes: [],
          defaultDataScopeId: null,
        },
      ],
    });

    render(<WorkspaceLandingPage />);
    expect(screen.getByTestId('landing-target')).toHaveTextContent(
      '/workspace/platform/overview',
    );
  });

  it('keeps the Project home available without Organizations or admin grants', () => {
    landingTestState.currentUser = createLandingUser({});

    render(<WorkspaceLandingPage />);
    expect(screen.getByTestId('landing-target')).toHaveTextContent(
      '/workspace/platform/overview',
    );
  });
});
