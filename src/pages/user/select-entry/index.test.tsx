import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrganizationAccess } from '@/services/auth';
import SelectEntry from './index';
import { setDefaultOrganization } from './service';

const testState = vi.hoisted(() => ({
  initialState: {
    currentUser: {
      name: 'Test User',
      isSuperAdmin: false,
      organizations: [] as OrganizationAccess[],
      defaultOrganizationId: null as string | null,
    },
  },
  setInitialState: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('@umijs/max', async () => {
  const { generatePath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath,
    Helmet: ({ children }: any) => children,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
    history: { replace: testState.replace },
    useModel: () => ({
      initialState: testState.initialState,
      setInitialState: testState.setInitialState,
    }),
  };
});

vi.mock('./service', () => ({
  setDefaultOrganization: vi.fn(),
}));

vi.mock('@/components', () => ({
  Footer: () => null,
}));

const organization: OrganizationAccess = {
  organizationId: 'organization-2',
  organizationCode: 'ORG2',
  organizationName: '组织二',
  permissions: [],
  appCodes: ['file-review'],
  dataScopes: [],
  defaultDataScopeId: null,
};

describe('SelectEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.initialState.currentUser.organizations = [organization];
    testState.initialState.currentUser.defaultOrganizationId = null;
    testState.initialState.currentUser.isSuperAdmin = false;
  });

  it('sets the selected Organization as default and enters its home', async () => {
    vi.mocked(setDefaultOrganization).mockResolvedValue({
      success: true,
      data: { defaultOrganizationId: organization.organizationId },
      traceId: 'trace-default-organization',
    });
    render(<SelectEntry />);

    fireEvent.click(screen.getByLabelText(/组织二/));
    fireEvent.click(screen.getByRole('button', { name: '进入首页' }));

    await waitFor(() => {
      expect(setDefaultOrganization).toHaveBeenCalledWith(
        organization.organizationId,
      );
    });
    expect(testState.replace).toHaveBeenCalledWith(
      '/workspace/org/organization-2/home',
    );
    const updateState = testState.setInitialState.mock.calls[0][0];
    expect(
      updateState(testState.initialState).currentUser.defaultOrganizationId,
    ).toBe(organization.organizationId);
  });

  it('shows default Organization API errors', async () => {
    vi.mocked(setDefaultOrganization).mockRejectedValue(
      new Error('设置默认组织失败'),
    );
    render(<SelectEntry />);
    fireEvent.click(screen.getByLabelText(/组织二/));
    fireEvent.click(screen.getByRole('button', { name: '进入首页' }));
    expect(await screen.findByText('设置默认组织失败')).toBeInTheDocument();
  });

  it('shows Project management only to Project Admin', () => {
    testState.initialState.currentUser.organizations = [];
    testState.initialState.currentUser.isSuperAdmin = true;
    render(<SelectEntry />);
    expect(screen.getByText('项目控制台')).toBeVisible();

    fireEvent.click(screen.getByLabelText(/项目控制台/));
    fireEvent.click(screen.getByRole('button', { name: '进入首页' }));

    expect(testState.replace).toHaveBeenCalledWith(
      '/workspace/platform/overview',
    );
  });

  it('hides Project management from regular users', () => {
    render(<SelectEntry />);
    expect(screen.queryByText('项目控制台')).not.toBeInTheDocument();
    expect(screen.getByText('组织二')).toBeVisible();
  });
});
