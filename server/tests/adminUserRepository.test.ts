import type { Pool } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';
import { AdminUserRepository } from '../src/repositories/adminUserRepository.js';

const userId = '11111111-1111-4111-8111-111111111111';
const organizationId = '22222222-2222-4222-8222-222222222222';

describe('AdminUserRepository', () => {
  it('uses validated paging literals and maps database booleans', async () => {
    const execute = vi.fn(async (sql: string, _values?: unknown[]) => {
      if (sql.includes('COUNT(*)')) return [[{ total: 1 }], []];
      if (sql.includes('FROM organization_members')) return [[], []];
      return [
        [
          {
            userId,
            username: 'sadmin',
            email: 'sadmin@example.com',
            name: 'Super Admin',
            avatar: null,
            status: 'active',
            isSuperAdmin: 1,
            defaultOrganizationId: null,
            createdAt: new Date('2026-07-22T00:00:00.000Z'),
            updatedAt: new Date('2026-07-22T00:00:00.000Z'),
            deletedAt: null,
          },
        ],
        [],
      ];
    });
    const repository = new AdminUserRepository({
      execute,
    } as unknown as Pool);

    const result = await repository.list({
      page: 2,
      pageSize: 20,
      keyword: 'admin',
      status: 'active',
      sortBy: 'username',
      sortOrder: 'asc',
    });

    expect(result).toMatchObject({
      page: 2,
      pageSize: 20,
      total: 1,
      list: [{ username: 'sadmin', isSuperAdmin: true }],
    });
    const listCall = execute.mock.calls.find(
      ([sql]) => !sql.includes('COUNT(*)') && sql.includes('FROM users'),
    );
    expect(listCall?.[0]).toContain('ORDER BY username ASC, id ASC');
    expect(listCall?.[0]).toContain('LIMIT 20 OFFSET 20');
    expect(listCall?.[1]).toEqual(['%admin%', '%admin%', '%admin%', 'active']);
  });

  it('attaches active organizations to the user page', async () => {
    const now = new Date('2026-07-22T00:00:00.000Z');
    const pool = {
      execute: vi.fn(async (sql: string) => {
        if (sql.includes('COUNT(*)')) return [[{ total: 1 }], []];
        if (sql.includes('FROM organization_members')) {
          return [
            [
              {
                userId,
                organizationId,
                organizationCode: 'ORG1',
                organizationName: '组织一',
              },
            ],
            [],
          ];
        }
        return [
          [
            {
              userId,
              username: 'member',
              email: 'member@example.com',
              name: 'Member',
              avatar: null,
              status: 'active',
              isSuperAdmin: 0,
              defaultOrganizationId: organizationId,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
            },
          ],
          [],
        ];
      }),
    } as unknown as Pool;

    const page = await new AdminUserRepository(pool).list({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(page.list[0]?.organizations).toEqual([
      {
        organizationId,
        organizationCode: 'ORG1',
        organizationName: '组织一',
      },
    ]);
  });

  it('replaces memberships and invalidates existing tokens in one transaction', async () => {
    const execute = vi.fn(async (sql: string, _values?: unknown[]) => {
      if (sql.includes('FROM users')) return [[{ id: userId }], []];
      if (sql.includes('FROM organizations')) {
        return [
          [
            {
              organizationId,
              organizationCode: 'ORG1',
              organizationName: '组织一',
            },
          ],
          [],
        ];
      }
      return [{ affectedRows: 1 }, []];
    });
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      execute,
      release: vi.fn(),
      rollback: vi.fn(),
    };
    const pool = {
      getConnection: vi.fn(async () => connection),
    } as unknown as Pool;

    await expect(
      new AdminUserRepository(pool).setOrganizations(userId, [organizationId]),
    ).resolves.toEqual([
      {
        organizationId,
        organizationCode: 'ORG1',
        organizationName: '组织一',
      },
    ]);

    const statements = execute.mock.calls.map(([sql]) => sql.trim());
    expect(
      statements.findIndex((sql) =>
        sql.startsWith('DELETE FROM user_access_grants'),
      ),
    ).toBeLessThan(
      statements.findIndex((sql) =>
        sql.startsWith('DELETE FROM organization_members'),
      ),
    );
    expect(
      statements.some((sql) =>
        sql.includes('INSERT INTO organization_members'),
      ),
    ).toBe(true);
    expect(
      statements.some((sql) =>
        sql.includes('token_version = token_version + 1'),
      ),
    ).toBe(true);
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
  });

  it('restores a disabled user and invalidates existing tokens', async () => {
    const execute = vi.fn(async (sql: string, _values?: unknown[]) => {
      if (sql.includes('FROM users')) {
        return [[{ userId, status: 'disabled', isSuperAdmin: 0 }], []];
      }
      return [{ affectedRows: 1 }, []];
    });
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      execute,
      release: vi.fn(),
      rollback: vi.fn(),
    };
    const pool = {
      getConnection: vi.fn(async () => connection),
    } as unknown as Pool;

    await expect(
      new AdminUserRepository(pool).setStatus(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        userId,
        'active',
      ),
    ).resolves.toEqual({ userId, status: 'active' });

    expect(
      execute.mock.calls.some(
        ([sql, values]) =>
          sql.includes('token_version = token_version + 1') &&
          values?.[0] === 'active',
      ),
    ).toBe(true);
    expect(connection.commit).toHaveBeenCalledOnce();
  });

  it('keeps the last active Super Admin enabled', async () => {
    const execute = vi.fn(async (sql: string) => {
      if (sql.includes('is_super_admin = TRUE')) return [[{ id: userId }], []];
      if (sql.includes('FROM users')) {
        return [[{ userId, status: 'active', isSuperAdmin: 1 }], []];
      }
      return [{ affectedRows: 1 }, []];
    });
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      execute,
      release: vi.fn(),
      rollback: vi.fn(),
    };
    const pool = {
      getConnection: vi.fn(async () => connection),
    } as unknown as Pool;

    await expect(
      new AdminUserRepository(pool).setStatus(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        userId,
        'disabled',
      ),
    ).resolves.toBe('last_super_admin');
    expect(
      execute.mock.calls.some(([sql]) => sql.trim().startsWith('UPDATE users')),
    ).toBe(false);
  });
});
