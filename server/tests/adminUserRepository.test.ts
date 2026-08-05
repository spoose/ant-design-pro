import type { Pool } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';
import { AdminUserRepository } from '../src/repositories/adminUserRepository.js';

describe('AdminUserRepository', () => {
  it('uses validated paging literals and maps database booleans', async () => {
    const execute = vi.fn(async (sql: string, _values: unknown[]) => {
      if (sql.includes('COUNT(*)')) return [[{ total: 1 }], []];
      return [
        [
          {
            userId: '11111111-1111-4111-8111-111111111111',
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
      ([sql]) => !sql.includes('COUNT(*)'),
    );
    expect(listCall?.[0]).toContain('ORDER BY username ASC, id ASC');
    expect(listCall?.[0]).toContain('LIMIT 20 OFFSET 20');
    expect(listCall?.[1]).toEqual(['%admin%', '%admin%', '%admin%', 'active']);
  });
});
