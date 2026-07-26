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
  platformPermissions: ['platform:user:manage'],
  platformSkillCodes: ['knowledge-search'],
  organizations: [
    {
      organizationId: 'organization-1',
      organizationCode: 'ORG1',
      organizationName: '组织一',
      permissions: ['organization:user:manage'],
      skillCodes: ['file-review'],
      dataScopes: [],
    },
  ],
} as AuthCurrentUser;

describe('resolveWorkspaceRouteDecision', () => {
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

  it('returns 404 decisions for unknown pages and Skill codes', () => {
    expect(
      resolveWorkspaceRouteDecision(user, '/workspace/platform/not-a-page'),
    ).toEqual({ kind: 'not-found' });
    expect(
      resolveWorkspaceRouteDecision(
        user,
        '/workspace/org/organization-1/apps/missing-skill/overview',
      ),
    ).toEqual({ kind: 'not-found' });
    expect(
      resolveWorkspaceRouteDecision(
        user,
        '/workspace/org/organization-1/apps/file-review/missing-page',
      ),
    ).toEqual({ kind: 'not-found' });
  });
});
