import { describe, expect, it, vi } from 'vitest';
import type { AuthCurrentUser } from '@/services/auth';
import {
  ACCESS_PENDING_PATH,
  getOrganizationAppPagePath,
  getOrganizationAppWorkspacePath,
  getOrganizationHomePath,
  getOrganizationPagePath,
  getOrganizationStatsPagePath,
  getPlatformAppPagePath,
  getPlatformAppWorkspacePath,
  getPlatformHomePath,
  getPlatformPagePath,
  getPlatformStatsPagePath,
  getPlatformStatsRootPath,
  getWorkspaceAppKey,
  getWorkspaceAppPageKey,
  getWorkspaceOrganizationId,
  getWorkspaceOrganizationPageKey,
  getWorkspacePlatformPageKey,
  getWorkspaceStatsPageKey,
  isPlatformWorkspacePath,
  isWorkspaceStatsPath,
  ORGANIZATION_APP_PATTERN,
  ORGANIZATION_PAGE_PATTERN,
  ORGANIZATION_WORKSPACE_PATTERN,
  PLATFORM_APP_PATTERN,
  PLATFORM_PAGE_PATTERN,
  resolveLandingPath,
  resolveWorkspaceScopeFromPath,
} from './workspaceRoutes';

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return { generatePath, matchPath };
});

describe('workspaceRoutes', () => {
  it('builds the confirmed Platform and Organization URLs', () => {
    expect(PLATFORM_PAGE_PATTERN).toBe('/workspace/platform/:platformPageKey');
    expect(PLATFORM_APP_PATTERN).toBe('/workspace/platform/apps/:appKey/*');
    expect(ORGANIZATION_PAGE_PATTERN).toBe(
      '/workspace/org/:organizationId/:pageKey',
    );
    expect(ORGANIZATION_WORKSPACE_PATTERN).toBe(
      '/workspace/org/:organizationId/*',
    );
    expect(ORGANIZATION_APP_PATTERN).toBe(
      '/workspace/org/:organizationId/apps/:appKey/*',
    );
    expect(getPlatformHomePath()).toBe('/workspace/platform/overview');
    expect(getPlatformPagePath('organizations')).toBe(
      '/workspace/platform/organizations',
    );
    expect(getPlatformAppWorkspacePath('knowledge search')).toBe(
      '/workspace/platform/apps/knowledge%20search',
    );
    expect(getPlatformAppPagePath('knowledge search', 'search history')).toBe(
      '/workspace/platform/apps/knowledge%20search/search%20history',
    );
    expect(getOrganizationHomePath('organization/a')).toBe(
      '/workspace/org/organization%2Fa/home',
    );
    expect(getOrganizationPagePath('organization/a', 'members')).toBe(
      '/workspace/org/organization%2Fa/members',
    );
    expect(
      getOrganizationAppWorkspacePath('organization/a', 'file review'),
    ).toBe('/workspace/org/organization%2Fa/apps/file%20review');
    expect(
      getOrganizationAppPagePath(
        'organization/a',
        'file review',
        'review queue',
      ),
    ).toBe('/workspace/org/organization%2Fa/apps/file%20review/review%20queue');
  });

  it('derives Scope and App identity from the Browser URL', () => {
    const organizationAppPath =
      '/workspace/org/organization%2Fa/apps/file-review/history';
    expect(getWorkspaceOrganizationId(organizationAppPath)).toBe(
      'organization/a',
    );
    expect(getWorkspaceAppKey(organizationAppPath)).toBe('file-review');
    expect(getWorkspaceAppPageKey(organizationAppPath)).toBe('history');
    expect(
      getWorkspaceAppPageKey(
        '/workspace/platform/apps/knowledge-search/sources/detail-1',
      ),
    ).toBe('sources');
    expect(
      getWorkspaceAppPageKey('/workspace/org/organization-1/apps/file-review'),
    ).toBeUndefined();
    expect(getWorkspacePlatformPageKey('/workspace/platform/permissions')).toBe(
      'permissions',
    );
    expect(
      getWorkspaceOrganizationPageKey('/workspace/org/organization-1/members'),
    ).toBe('members');
    expect(getPlatformStatsRootPath()).toBe('/workspace/platform/stats');
    expect(getPlatformStatsPagePath('users')).toBe(
      '/workspace/platform/stats/users',
    );
    expect(getOrganizationStatsPagePath('organization-1', 'traces')).toBe(
      '/workspace/org/organization-1/stats/traces',
    );
    expect(getWorkspaceStatsPageKey('/workspace/platform/stats/requests')).toBe(
      'requests',
    );
    expect(isWorkspaceStatsPath('/workspace/platform/stats')).toBe(true);
    expect(isWorkspaceStatsPath('/workspace/platform/overview')).toBe(false);
    expect(resolveWorkspaceScopeFromPath(organizationAppPath)).toEqual({
      kind: 'organization',
      organizationId: 'organization/a',
    });
    expect(
      resolveWorkspaceScopeFromPath('/workspace/platform/overview'),
    ).toEqual({ kind: 'platform' });
    expect(
      resolveWorkspaceScopeFromPath('/workspace/platform/stats/requests'),
    ).toEqual({ kind: 'platform' });
    expect(
      resolveWorkspaceScopeFromPath('/dashboard/analysis'),
    ).toBeUndefined();
  });

  it('does not mistake Organization routes for Platform routes', () => {
    expect(isPlatformWorkspacePath('/workspace/platform/users')).toBe(true);
    expect(isPlatformWorkspacePath('/workspace/platform/stats/users')).toBe(
      true,
    );
    expect(isPlatformWorkspacePath('/workspace/org/organization-1/home')).toBe(
      false,
    );
  });

  it('resolves currentUser to one canonical landing URL', () => {
    const organization = {
      organizationId: 'organization-1',
      organizationCode: 'ORG1',
      organizationName: '组织一',
      permissions: [],
      skillCodes: [],
      dataScopes: [],
      defaultDataScopeId: null,
    };
    const regularUser = {
      userId: 'regular-user',
      username: 'regular-user',
      name: 'Regular User',
      avatar: null,
      email: 'regular-user@example.test',
      status: 'active',
      isSuperAdmin: false,
      platformPermissions: [],
      platformSkillCodes: [],
      defaultOrganizationId: 'organization-1',
      organizations: [organization],
    } as AuthCurrentUser;

    expect(
      resolveLandingPath({
        ...regularUser,
        platformPermissions: ['platform:user:manage'],
      }),
    ).toBe('/workspace/platform/overview');
    expect(resolveLandingPath(regularUser)).toBe(
      '/workspace/org/organization-1/home',
    );
    expect(
      resolveLandingPath({
        ...regularUser,
        defaultOrganizationId: null,
        organizations: [
          organization,
          {
            ...organization,
            organizationId: 'organization-2',
          },
        ],
      }),
    ).toBe('/workspace/org/organization-1/home');
    expect(
      resolveLandingPath({
        ...regularUser,
        defaultOrganizationId: null,
        organizations: [],
      }),
    ).toBe(ACCESS_PENDING_PATH);
  });
});
