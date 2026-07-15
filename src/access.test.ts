import { describe, expect, it } from 'vitest';
import access from './access';
import type { AccessContext, AuthCurrentUser } from './services/auth';

const createContext = (
  id: string,
  permissions: string[],
  skillCodes: string[] = [],
): AccessContext => ({
  id,
  systemId: `system-${id}`,
  systemCode: id.toUpperCase(),
  systemName: `System ${id}`,
  scopeType: 'system',
  permissions,
  skillCodes,
});

const createUser = (contexts: AccessContext[]): AuthCurrentUser =>
  ({
    userid: '1',
    name: 'Test User',
    contexts,
  }) as AuthCurrentUser;

describe('access', () => {
  it('should expose permissions from the current context', () => {
    const context = createContext('sys1', ['user:view', 'user:create']);
    const result = access({
      currentUser: createUser([context]),
      currentContextId: context.id,
    });

    expect(result.hasPermission('user:view')).toBe(true);
    expect(result.hasPermission('user:delete')).toBe(false);
  });

  it('should allow admin page and wildcard permissions', () => {
    const adminContext = createContext('admin', ['page:admin']);
    const wildcardContext = createContext('wildcard', ['*']);

    expect(
      access({
        currentUser: createUser([adminContext]),
        currentContextId: adminContext.id,
      }).canAdmin,
    ).toBe(true);
    expect(
      access({
        currentUser: createUser([wildcardContext]),
        currentContextId: wildcardContext.id,
      }).canDashboardMonitor,
    ).toBe(true);
  });

  it('should change permissions when the current context changes', () => {
    const sys1 = createContext('sys1', [
      'page:dashboard-analysis',
      'page:dashboard-workplace',
    ]);
    const sys2 = createContext('sys2', ['page:dashboard-analysis']);
    const currentUser = createUser([sys1, sys2]);

    const sys1Access = access({ currentUser, currentContextId: sys1.id });
    const sys2Access = access({ currentUser, currentContextId: sys2.id });

    expect(sys1Access.hasPermission('page:dashboard-workplace')).toBe(true);
    expect(sys2Access.hasPermission('page:dashboard-workplace')).toBe(false);
  });

  it('should expose route access from page permissions', () => {
    const context = createContext('sys1', [
      'page:dashboard-analysis',
      'page:dashboard-workplace',
    ]);
    const result = access({
      currentUser: createUser([context]),
      currentContextId: context.id,
    });

    expect(result.canDashboardAnalysis).toBe(true);
    expect(result.canDashboardWorkplace).toBe(true);
    expect(result.canDashboardMonitor).toBe(false);
    expect(result.canOperationsConfig).toBe(false);
  });

  it('should change route access when the current context changes', () => {
    const sys1 = createContext('sys1', ['page:operations-config']);
    const sys2 = createContext('sys2', ['page:dashboard-monitor']);
    const currentUser = createUser([sys1, sys2]);

    const sys1Access = access({ currentUser, currentContextId: sys1.id });
    const sys2Access = access({ currentUser, currentContextId: sys2.id });

    expect(sys1Access.canOperationsConfig).toBe(true);
    expect(sys1Access.canDashboardMonitor).toBe(false);
    expect(sys2Access.canOperationsConfig).toBe(false);
    expect(sys2Access.canDashboardMonitor).toBe(true);
  });

  it('should not use permissions from an unselected context', () => {
    const adminContext = createContext('admin', ['page:admin']);
    const userContext = createContext('user', ['page:home']);
    const result = access({
      currentUser: createUser([adminContext, userContext]),
      currentContextId: userContext.id,
    });

    expect(result.canAdmin).toBe(false);
  });

  it('should deny permissions when no valid context is selected', () => {
    const context = createContext('sys1', ['page:dashboard-analysis']);

    expect(
      access({
        currentUser: createUser([context]),
        currentContextId: 'missing',
      }).hasPermission('page:dashboard-analysis'),
    ).toBe(false);
    expect(access(undefined).canAdmin).toBe(false);
    expect(access(undefined).canDashboardAnalysis).toBe(false);
  });
});
