import { beforeEach, describe, expect, it, vi } from 'vitest';
import access from './access';
import type { AuthCurrentUser } from './services/auth';

const testLocation = vi.hoisted(() => ({
  pathname: '/workspace/org/organization-1/home',
}));

vi.mock('@umijs/max', async () => {
  const { matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return { history: { location: testLocation }, matchPath };
});

const currentUser = {
  userId: 'user-1',
  platformPermissions: ['platform:user:manage'],
  platformSkillCodes: [],
  organizations: [
    {
      organizationId: 'organization-1',
      organizationCode: 'ORG1',
      organizationName: '组织一',
      permissions: ['page:home', 'page:dashboard-analysis'],
      skillCodes: [],
      dataScopes: [],
    },
    {
      organizationId: 'organization-2',
      organizationCode: 'ORG2',
      organizationName: '组织二',
      permissions: ['page:dashboard-monitor'],
      skillCodes: [],
      dataScopes: [],
    },
  ],
} as AuthCurrentUser;

describe('access', () => {
  beforeEach(() => {
    testLocation.pathname = '/workspace/org/organization-1/home';
  });

  it('reads page permissions from the Organization in the URL', () => {
    const result = access({ currentUser });
    expect(result.canHome).toBe(true);
    expect(result.canDashboardAnalysis).toBe(true);
    expect(result.canDashboardMonitor).toBe(false);
  });

  it('does not reuse Organization permissions in another Scope', () => {
    testLocation.pathname = '/workspace/platform/overview';
    const result = access({ currentUser });
    expect(result.canHome).toBe(false);
    expect(result.canDashboardAnalysis).toBe(false);
  });
});
