import { describe, expect, it } from 'vitest';
import type { AuthCurrentUser, OrganizationAccess } from '@/services/auth';
import {
  getAccessibleOrganizations,
  getOrganizationAccess,
  getPlatformAccess,
} from './workspaceRules';

const createOrganization = (
  organizationId: string,
  permissions: string[] = [],
  appCodes: string[] = [],
): OrganizationAccess => ({
  organizationId,
  organizationCode: organizationId.toUpperCase(),
  organizationName: `Organization ${organizationId}`,
  permissions,
  appCodes,
  dataScopes: [],
  defaultDataScopeId: null,
});

const createUser = ({
  isSuperAdmin = false,
  platformPermissions = [],
  projectAppCodes = [],
  organizations = [],
  defaultOrganizationId,
}: {
  isSuperAdmin?: boolean;
  platformPermissions?: string[];
  projectAppCodes?: string[];
  organizations?: OrganizationAccess[];
  defaultOrganizationId?: string | null;
} = {}): AuthCurrentUser =>
  ({
    userId: 'workspace-user',
    username: 'workspace-user',
    name: 'Workspace User',
    avatar: null,
    email: 'workspace-user@example.test',
    status: 'active',
    isSuperAdmin,
    platformPermissions,
    projectAppCodes,
    organizations,
    defaultOrganizationId: defaultOrganizationId ?? null,
  }) as AuthCurrentUser;

describe('workspace access rules', () => {
  it('keeps Platform permissions and Apps separate from Organizations', () => {
    const user = createUser({
      platformPermissions: [
        'platform:organization:create',
        'platform:audit:view',
      ],
      projectAppCodes: ['ai-assistant'],
      organizations: [
        createOrganization(
          'org-1',
          ['organization:user:manage'],
          ['file-review'],
        ),
      ],
    });
    const access = getPlatformAccess(user);

    expect(access.canEnterManagementCenter).toBe(true);
    expect(access.canManageOrganizations).toBe(true);
    expect(access.canManagePlatformUsers).toBe(false);
    expect(access.canViewPlatformAudit).toBe(true);
    expect(access.canViewStats).toBe(true);
    expect(access.canUseApp('ai-assistant')).toBe(true);
    expect(access.canUseApp('file-review')).toBe(false);
    expect(access.visibleMenuKeys).toEqual([
      'overview',
      'organizations',
      'logs',
    ]);
  });

  it('keeps the Project home public without granting management routes', () => {
    const access = getPlatformAccess(createUser());

    expect(access.canEnterManagementCenter).toBe(false);
    expect(access.canViewStats).toBe(false);
    expect(access.visibleMenuKeys).toEqual(['overview']);
  });

  it('reuses every Project management menu for Project Admin', () => {
    const access = getPlatformAccess(createUser({ isSuperAdmin: true }));

    expect(access.canEnterManagementCenter).toBe(true);
    expect(access.canManageOrganizations).toBe(true);
    expect(access.canManagePlatformUsers).toBe(true);
    expect(access.canGrantPlatformPermissions).toBe(true);
    expect(access.canViewPlatformAudit).toBe(true);
    expect(access.visibleMenuKeys).toEqual([
      'overview',
      'organizations',
      'users',
      'permissions',
      'logs',
    ]);
  });

  it('deduplicates Organizations without merging their permissions', () => {
    const original = createOrganization('org-1', ['permission:a']);
    const duplicate = createOrganization('org-1', ['permission:b']);
    const organizations = getAccessibleOrganizations(
      createUser({ organizations: [original, duplicate] }),
    );

    expect(organizations).toEqual([original]);
    expect(organizations[0].permissions).toEqual(['permission:a']);
  });

  it('resolves menus and Apps only from the requested Organization', () => {
    const user = createUser({
      organizations: [
        createOrganization(
          'org-1',
          [
            'organization:user:manage',
            'organization:role:manage',
            'organization:settings:update',
          ],
          ['file-review'],
        ),
        createOrganization('org-2', [], ['knowledge-search']),
      ],
    });

    expect(getOrganizationAccess(user, 'org-1').visibleMenuKeys).toEqual([
      'home',
      'members',
      'roles',
      'settings',
    ]);
    expect(getOrganizationAccess(user, 'org-1').canViewStats).toBe(true);
    expect(getOrganizationAccess(user, 'org-2').canViewStats).toBe(false);
    expect(getOrganizationAccess(user, 'org-1').canUseApp('file-review')).toBe(
      true,
    );
    expect(getOrganizationAccess(user, 'org-2').canUseApp('file-review')).toBe(
      false,
    );
    expect(getOrganizationAccess(user, 'missing').accessible).toBe(false);
  });
});
