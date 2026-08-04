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

const organization: OrganizationAccess = {
  organizationId: 'organization-2',
  organizationCode: 'ORG2',
  organizationName: '组织二',
  permissions: [],
  skillCodes: ['file-review'],
  dataScopes: [],
  defaultDataScopeId: null,
};

describe('SelectEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.initialState.currentUser.organizations = [organization];
    testState.initialState.currentUser.defaultOrganizationId = null;
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

  it('keeps submit disabled without Organizations', () => {
    testState.initialState.currentUser.organizations = [];
    render(<SelectEntry />);
    expect(screen.getByText('暂无可选登录入口')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '进入首页' })).toBeDisabled();
  });
});
