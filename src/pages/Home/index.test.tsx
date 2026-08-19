import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrganizationAccess } from '@/services/auth';
import Home from './index';

const organization: OrganizationAccess = {
  organizationId: 'organization-1',
  organizationCode: 'ORG1',
  organizationName: '组织一',
  permissions: [],
  skillCodes: [],
  dataScopes: [],
  defaultDataScopeId: null,
};
const testState = vi.hoisted(() => ({
  organizationId: 'organization-1',
  initialState: {
    currentUser: { organizations: [] as OrganizationAccess[] },
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

vi.mock('@/components/CurrentAccessOverview', () => ({
  CurrentAccessOverview: ({
    organization: currentOrganization,
  }: {
    organization: OrganizationAccess;
  }) => <div>overview:{currentOrganization.organizationId}</div>,
}));

describe('Home', () => {
  beforeEach(() => {
    testState.organizationId = 'organization-1';
  });

  it('renders the Organization access overview from the URL', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: '组织首页' })).toBeVisible();
    expect(screen.getByText('组织一')).toBeVisible();
    expect(screen.getByText('overview:organization-1')).toBeVisible();
  });

  it('exposes an invalid Organization URL', () => {
    testState.organizationId = 'missing';
    render(<Home />);
    expect(screen.getByRole('alert')).toHaveTextContent('未找到当前组织');
  });
});
