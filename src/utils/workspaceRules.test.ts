import { describe, expect, it } from 'vitest';
import type { AuthCurrentUser, OrganizationAccess } from '@/services/auth';
import {
  getAccessibleOrganizations,
  getOrganizationAccess,
  getPlatformAccess,
  resolveLandingWorkspace,
} from './workspaceRules';

const createOrganization = (
  organizationId: string,
  permissions: string[] = [],
  skillCodes: string[] = [],
): OrganizationAccess => ({
  organizationId,
  organizationCode: organizationId.toUpperCase(),
  organizationName: `Organization ${organizationId}`,
  permissions,
  skillCodes,
  dataScopes: [],
});

const createUser = ({
  platformPermissions = [],
  platformSkillCodes = [],
  organizations = [],
  defaultOrganizationId,
}: {
  platformPermissions?: string[];
  platformSkillCodes?: string[];
  organizations?: OrganizationAccess[];
  defaultOrganizationId?: string;
} = {}): AuthCurrentUser =>
  ({
    userid: 'workspace-user',
    name: 'Workspace User',
    platformPermissions,
    platformSkillCodes,
    organizations,
    defaultOrganizationId,
  }) as AuthCurrentUser;

describe('workspace access rules', () => {
  it('keeps Platform permissions and Skills separate from Organizations', () => {
    const user = createUser({
      platformPermissions: [
        'platform:organization:create',
        'platform:audit:view',
      ],
      platformSkillCodes: ['platform-assistant'],
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
    expect(access.canUseSkill('platform-assistant')).toBe(true);
    expect(access.canUseSkill('file-review')).toBe(false);
    expect(access.visibleMenuKeys).toEqual([
      'overview',
      'organizations',
      'audit',
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

  it('resolves menus and Skills only from the requested Organization', () => {
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
    expect(
      getOrganizationAccess(user, 'org-1').canUseSkill('file-review'),
    ).toBe(true);
    expect(
      getOrganizationAccess(user, 'org-2').canUseSkill('file-review'),
    ).toBe(false);
    expect(getOrganizationAccess(user, 'missing').accessible).toBe(false);
  });
});

describe('workspace landing rules', () => {
  it('prioritizes Platform access', () => {
    expect(
      resolveLandingWorkspace(
        createUser({
          platformPermissions: ['platform:user:manage'],
          organizations: [createOrganization('org-1')],
        }),
      ),
    ).toEqual({ kind: 'platform' });
  });

  it('uses a valid default Organization before other Organizations', () => {
    expect(
      resolveLandingWorkspace(
        createUser({
          defaultOrganizationId: 'org-2',
          organizations: [
            createOrganization('org-1'),
            createOrganization('org-2'),
          ],
        }),
      ),
    ).toEqual({ kind: 'organization', organizationId: 'org-2' });
  });

  it('enters the only Organization and asks when multiple have no default', () => {
    expect(
      resolveLandingWorkspace(
        createUser({ organizations: [createOrganization('org-1')] }),
      ),
    ).toEqual({ kind: 'organization', organizationId: 'org-1' });
    expect(
      resolveLandingWorkspace(
        createUser({
          organizations: [
            createOrganization('org-1'),
            createOrganization('org-2'),
          ],
        }),
      ),
    ).toEqual({ kind: 'organization-selection' });
  });

  it('returns an explicit unauthorized target without access', () => {
    expect(resolveLandingWorkspace(createUser())).toEqual({
      kind: 'unauthorized',
      reason: 'no-access',
    });
  });
});
