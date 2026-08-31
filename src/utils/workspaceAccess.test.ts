import { describe, expect, it, vi } from 'vitest';
import type { AuthCurrentUser } from '@/services/auth';
import { resolveWorkspaceRouteDecision } from './workspaceAccess';

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return { generatePath, matchPath };
});

const user = {
  userId: 'workspace-user',
  username: 'workspace-user',
  name: 'Workspace User',
  avatar: null,
  email: 'workspace-user@example.test',
  status: 'active',
  isSuperAdmin: false,
  platformPermissions: ['platform:user:manage'],
  projectAppCodes: ['knowledge-search'],
  defaultOrganizationId: null,
  organizations: [
    {
      organizationId: 'organization-1',
      organizationCode: 'ORG1',
      organizationName: '组织一',
      permissions: ['organization:user:manage'],
      appCodes: ['file-review'],
      dataScopes: [],
      defaultDataScopeId: null,
    },
  ],
} as AuthCurrentUser;

describe('resolveWorkspaceRouteDecision', () => {
  it('opens the shared Project home without exposing management pages', () => {
    const regularUser = {
      ...user,
      platformPermissions: [],
      projectAppCodes: [],
    } as AuthCurrentUser;

    expect(
      resolveWorkspaceRouteDecision(
        regularUser,
        '/workspace/platform/overview',
      ),
    ).toEqual({ kind: 'allow' });
    expect(
      resolveWorkspaceRouteDecision(regularUser, '/workspace/platform/users'),
    ).toEqual({ kind: 'forbidden' });
    expect(
      resolveWorkspaceRouteDecision(
        regularUser,
        '/workspace/platform/apps/knowledge-search/overview',
      ),
    ).toEqual({ kind: 'forbidden' });
  });

  it('allows authorized Platform and Organization routes', () => {
    expect(
      resolveWorkspaceRouteDecision(user, '/workspace/platform/users'),
    ).toEqual({ kind: 'allow' });
    expect(
      resolveWorkspaceRouteDecision(
        user,
        '/workspace/org/organization-1/members',
      ),
    ).toEqual({ kind: 'allow' });
    expect(
      resolveWorkspaceRouteDecision(
        user,
        '/workspace/org/organization-1/apps/file-review/history',
      ),
    ).toEqual({ kind: 'allow' });
  });

  it('normalizes legacy App roots to the overview sibling route', () => {
    expect(
      resolveWorkspaceRouteDecision(
        user,
        '/workspace/platform/apps/knowledge-search',
      ),
    ).toEqual({
      kind: 'redirect',
      to: '/workspace/platform/apps/knowledge-search/overview',
    });
    expect(
      resolveWorkspaceRouteDecision(
        user,
        '/workspace/org/organization-1/apps/file-review',
      ),
    ).toEqual({
      kind: 'redirect',
      to: '/workspace/org/organization-1/apps/file-review/overview',
    });
  });

  it('returns 403 decisions for known resources outside the user grant', () => {
    expect(
      resolveWorkspaceRouteDecision(user, '/workspace/org/organization-2/home'),
    ).toEqual({ kind: 'forbidden' });
    expect(
      resolveWorkspaceRouteDecision(
        user,
        '/workspace/org/organization-1/settings',
      ),
    ).toEqual({ kind: 'forbidden' });
    expect(
      resolveWorkspaceRouteDecision(
        user,
        '/workspace/org/organization-1/apps/knowledge-search/overview',
      ),
    ).toEqual({ kind: 'forbidden' });
  });

  it('requires an XOne Organization URL to match the active Token Organization', () => {
    expect(
      resolveWorkspaceRouteDecision(
        user,
        '/workspace/org/organization-1/home',
        { backend: 'xone', activeOrganizationId: 'organization-1' },
      ),
    ).toEqual({ kind: 'allow' });
    expect(
      resolveWorkspaceRouteDecision(
        user,
        '/workspace/org/organization-1/home',
        { backend: 'xone', activeOrganizationId: 'organization-2' },
      ),
    ).toEqual({
      kind: 'redirect',
      to: '/workspace/platform/overview',
    });
    expect(
      resolveWorkspaceRouteDecision(
        user,
        '/workspace/org/organization-1/home',
        { backend: 'xone', activeOrganizationId: undefined },
      ),
    ).toEqual({
      kind: 'redirect',
      to: '/workspace/platform/overview',
    });
  });

  it('returns 404 decisions for unknown pages and App codes', () => {
    expect(
      resolveWorkspaceRouteDecision(user, '/workspace/platform/not-a-page'),
    ).toEqual({ kind: 'not-found' });
    expect(
      resolveWorkspaceRouteDecision(
        user,
        '/workspace/org/organization-1/apps/missing-app/overview',
      ),
    ).toEqual({ kind: 'not-found' });
    expect(
      resolveWorkspaceRouteDecision(
        user,
        '/workspace/org/organization-1/apps/file-review/missing-page',
      ),
    ).toEqual({ kind: 'not-found' });
  });

  it('allows admin stats pages and rejects unknown or unauthorized stats URLs', () => {
    expect(
      resolveWorkspaceRouteDecision(user, '/workspace/platform/stats/users'),
    ).toEqual({ kind: 'allow' });
    expect(
      resolveWorkspaceRouteDecision(user, '/workspace/platform/stats'),
    ).toEqual({
      kind: 'redirect',
      to: '/workspace/platform/stats/users',
    });
    expect(
      resolveWorkspaceRouteDecision(
        user,
        '/workspace/org/organization-1/stats/traces',
      ),
    ).toEqual({ kind: 'allow' });
    expect(
      resolveWorkspaceRouteDecision(user, '/workspace/platform/stats/unknown'),
    ).toEqual({ kind: 'not-found' });

    const memberOnly = {
      ...user,
      organizations: user.organizations.map((organization) => ({
        ...organization,
        permissions: [],
      })),
    } as AuthCurrentUser;
    expect(
      resolveWorkspaceRouteDecision(
        memberOnly,
        '/workspace/org/organization-1/stats/users',
      ),
    ).toEqual({ kind: 'forbidden' });
  });

  it('redirects 系统设置 to the first granted child and gates 日志', () => {
    expect(
      resolveWorkspaceRouteDecision(user, '/workspace/platform/system'),
    ).toEqual({
      kind: 'redirect',
      to: '/workspace/platform/users',
    });
    expect(
      resolveWorkspaceRouteDecision(user, '/workspace/platform/logs'),
    ).toEqual({ kind: 'forbidden' });
    expect(
      resolveWorkspaceRouteDecision(
        { ...user, platformPermissions: ['platform:audit:view'] },
        '/workspace/platform/system',
      ),
    ).toEqual({
      kind: 'redirect',
      to: '/workspace/platform/logs',
    });
    expect(
      resolveWorkspaceRouteDecision(
        { ...user, platformPermissions: ['platform:audit:view'] },
        '/workspace/platform/logs',
      ),
    ).toEqual({ kind: 'allow' });
  });
});
