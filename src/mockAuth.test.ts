import { describe, expect, it, vi } from 'vitest';
import {
  buildMockCurrentUser,
  getMockUsernameByAccessToken,
} from '../mock/user';

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return { generatePath, matchPath };
});

describe('mock auth users', () => {
  it('resolves each bearer token to its own account', () => {
    expect(getMockUsernameByAccessToken('mock-admin-access-token')).toBe(
      'admin',
    );
    expect(getMockUsernameByAccessToken('mock-user-access-token')).toBe('user');
    expect(getMockUsernameByAccessToken('mock-operator-access-token')).toBe(
      'operator',
    );
    expect(getMockUsernameByAccessToken('mock-users2-access-token')).toBe(
      'users2',
    );
    expect(getMockUsernameByAccessToken('unknown-token')).toBeUndefined();
  });

  it('gives the admin independent Platform and Organization access', () => {
    const user = buildMockCurrentUser('admin');

    expect(user.name).toBe('Admin User');
    expect(user.platformPermissions).toContain('platform:organization:create');
    expect(user.platformPermissions).toContain('platform:permission:grant');
    expect(user.projectAppCodes).toEqual(['knowledge-search']);
    expect(user.defaultOrganizationId).toBe('organization-1');
    expect(
      user.organizations.map((organization) => organization.organizationId),
    ).toEqual(['organization-1', 'organization-2']);
    expect(
      user.organizations.every((organization) =>
        organization.permissions.includes('page:admin'),
      ),
    ).toBe(true);
  });

  it('gives the standard user two restricted Organizations', () => {
    const user = buildMockCurrentUser('user');

    expect(user.name).toBe('Standard User');
    expect(user.platformPermissions).toEqual([]);
    expect(user.defaultOrganizationId).toBe('organization-1');
    expect(
      user.organizations.map((organization) => organization.organizationId),
    ).toEqual(['organization-1', 'organization-2']);
    expect(
      user.organizations.flatMap((organization) => organization.permissions),
    ).not.toContain('page:admin');
    expect(
      user.organizations.find(
        (organization) => organization.organizationId === 'organization-2',
      )?.permissions,
    ).not.toContain('page:dashboard-monitor');
  });

  it('keeps users2 isolated to Organization 2', () => {
    const user = buildMockCurrentUser('users2');

    expect(user.name).toBe('Organization 2 User');
    expect(user.platformPermissions).toEqual([]);
    expect(user.defaultOrganizationId).toBe('organization-2');
    expect(
      user.organizations.map((organization) => organization.organizationId),
    ).toEqual(['organization-2']);
  });

  it('gives the operator one Organization with Organization-level permissions', () => {
    const user = buildMockCurrentUser('operator');

    expect(user.name).toBe('Operator User');
    expect(user.platformPermissions).toEqual([]);
    expect(user.defaultOrganizationId).toBe('organization-1');
    expect(
      user.organizations.map((organization) => organization.organizationId),
    ).toEqual(['organization-1']);
    expect(user.organizations[0].permissions).toContain(
      'organization:user:manage',
    );
    expect(user.organizations[0].permissions).toContain(
      'page:operations-config',
    );
    expect(user.organizations[0].permissions).not.toContain(
      'page:dashboard-workplace',
    );
    expect(user.organizations[0].dataScopes).toHaveLength(2);
  });

  it('keeps the AI assistant page available for every displayed app', () => {
    for (const username of ['admin', 'user', 'operator', 'users2'] as const) {
      for (const organization of buildMockCurrentUser(username).organizations) {
        if (organization.appCodes.length > 0) {
          expect(organization.permissions).toContain('page:ai-assistant');
        }
      }
    }
  });
});
