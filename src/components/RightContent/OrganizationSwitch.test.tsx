import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthCurrentUser } from '@/services/auth';
import { OrganizationSwitch } from './OrganizationSwitch';

const testState = vi.hoisted(() => ({
  pathname: '/workspace/platform/overview',
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
    useLocation: () => ({ pathname: testState.pathname }),
    useModel: () => ({ initialState: { currentUser: testState.currentUser } }),
  };
});

vi.mock('../HeaderDropdown', () => ({
  default: ({ children, menu }: any) => (
    <div>
      {children}
      {menu.items.map((item: any) => (
        <span key={item.key}>{item.label}</span>
      ))}
    </div>
  ),
}));

const currentUser = {
  userid: 'user-1',
  platformPermissions: ['platform:user:manage'],
  platformSkillCodes: [],
  organizations: [
    {
      organizationId: 'organization-1',
      organizationCode: 'ORG1',
      organizationName: '组织一',
      permissions: [],
      skillCodes: [],
      dataScopes: [],
    },
  ],
} as AuthCurrentUser;

describe('OrganizationSwitch', () => {
  beforeEach(() => {
    testState.currentUser = currentUser;
    testState.pathname = '/workspace/platform/overview';
  });

  it('shows Platform and accessible Organizations as sibling workspaces', () => {
    render(<OrganizationSwitch />);
    expect(
      screen.getByRole('button', { name: '切换工作区，当前为管理中心' }),
    ).toBeVisible();
    expect(screen.getByText('管理中心')).toBeVisible();
    expect(screen.getByText('组织一')).toBeVisible();
  });

  it('derives the current Organization label from the URL', () => {
    testState.pathname = '/workspace/org/organization-1/home';
    render(<OrganizationSwitch />);
    expect(
      screen.getByRole('button', { name: '切换工作区，当前为组织一' }),
    ).toBeVisible();
  });
});
