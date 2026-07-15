import { describe, expect, it } from 'vitest';
import {
  buildMockCurrentUser,
  getMockUsernameByAccessToken,
} from '../mock/user';

describe('mock auth users', () => {
  it('resolves each bearer token to its own account', () => {
    expect(getMockUsernameByAccessToken('mock-admin-access-token')).toBe(
      'admin',
    );
    expect(getMockUsernameByAccessToken('mock-user-access-token')).toBe('user');
    expect(getMockUsernameByAccessToken('mock-operator-access-token')).toBe(
      'operator',
    );
    expect(getMockUsernameByAccessToken('unknown-token')).toBeUndefined();
  });

  it('gives the admin all three contexts and the admin page', () => {
    const user = buildMockCurrentUser('admin');

    expect(user.name).toBe('Admin User');
    expect(user.defaultContextId).toBe('ctx-s1-g1');
    expect(user.contexts.map((context) => context.id)).toEqual([
      'ctx-s1-g1',
      'ctx-s1-g2',
      'ctx-s2',
    ]);
    expect(
      user.contexts.every((context) =>
        context.permissions.includes('page:admin'),
      ),
    ).toBe(true);
  });

  it('gives the standard user two restricted contexts', () => {
    const user = buildMockCurrentUser('user');

    expect(user.name).toBe('Standard User');
    expect(user.defaultContextId).toBeUndefined();
    expect(user.contexts.map((context) => context.id)).toEqual([
      'ctx-s1-g1',
      'ctx-s2',
    ]);
    expect(
      user.contexts.flatMap((context) => context.permissions),
    ).not.toContain('page:admin');
    expect(
      user.contexts.find((context) => context.id === 'ctx-s2')?.permissions,
    ).not.toContain('page:dashboard-monitor');
  });

  it('gives the operator only the operations context', () => {
    const user = buildMockCurrentUser('operator');

    expect(user.name).toBe('Operator User');
    expect(user.defaultContextId).toBe('ctx-s1-g2');
    expect(user.contexts.map((context) => context.id)).toEqual(['ctx-s1-g2']);
    expect(user.contexts[0].permissions).toContain('page:dashboard-monitor');
    expect(user.contexts[0].permissions).toContain('page:operations-config');
    expect(user.contexts[0].permissions).not.toContain(
      'page:dashboard-workplace',
    );
  });

  it('keeps the AI assistant page available for every displayed skill', () => {
    for (const username of ['admin', 'user', 'operator'] as const) {
      for (const context of buildMockCurrentUser(username).contexts) {
        if (context.skillCodes.length > 0) {
          expect(context.permissions).toContain('page:ai-assistant');
        }
      }
    }
  });
});
