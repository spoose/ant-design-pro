import type { Pool } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';
import { OrganizationRepository } from '../src/repositories/organizationRepository.js';

const creatorUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const organizationId = '11111111-1111-4111-8111-111111111111';

const bootstrapGrants = [
  {
    userId: creatorUserId,
    createdBy: creatorUserId,
    grantType: 'permission',
    grantCode: 'organization:*',
  },
  ...[
    'ai-assistant',
    'file-review',
    'document-summary',
    'knowledge-search',
  ].map((grantCode) => ({
    userId: creatorUserId,
    createdBy: creatorUserId,
    grantType: 'app',
    grantCode,
  })),
];

function createDeletePool(options?: { includeAdditionalMember?: boolean }) {
  const execute = vi.fn(async (sql: string) => {
    if (sql.includes('FROM organizations') && sql.includes('FOR UPDATE')) {
      return [[{ organizationId, createdBy: creatorUserId }], []];
    }
    if (sql.includes('FROM organization_members')) {
      return [
        [
          { userId: creatorUserId },
          ...(options?.includeAdditionalMember
            ? [{ userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }]
            : []),
        ],
        [],
      ];
    }
    if (sql.includes('FROM user_access_grants')) {
      return [bootstrapGrants, []];
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
  return { connection, execute, pool };
}

describe('OrganizationRepository bootstrap access cleanup', () => {
  it('creates the organization, creator membership, and scoped grants in one transaction', async () => {
    const execute = vi.fn(async (_sql: string, _values?: unknown[]) => [
      { affectedRows: 1 },
      [],
    ]);
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      execute,
      release: vi.fn(),
      rollback: vi.fn(),
    };
    const now = new Date('2026-07-22T00:00:00.000Z');
    const pool = {
      execute: vi.fn(async () => [
        [
          {
            organizationId,
            organizationCode: 'NEW_ORG',
            organizationName: '新组织',
            status: 'active',
            createdAt: now,
            updatedAt: now,
          },
        ],
        [],
      ]),
      getConnection: vi.fn(async () => connection),
    } as unknown as Pool;
    const repository = new OrganizationRepository(pool);

    await expect(
      repository.create(
        {
          organizationCode: 'NEW_ORG',
          organizationName: '新组织',
          status: 'active',
        },
        {
          creatorUserId,
          permissions: ['organization:*'],
          appCodes: [
            'ai-assistant',
            'file-review',
            'document-summary',
            'knowledge-search',
          ],
        },
      ),
    ).resolves.toMatchObject({ organizationCode: 'NEW_ORG' });

    const organizationInsert = execute.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO organizations'),
    );
    const membershipInsert = execute.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO organization_members'),
    );
    const grantsInsert = execute.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO user_access_grants'),
    );
    expect(organizationInsert?.[1]).toEqual([
      expect.any(String),
      'NEW_ORG',
      '新组织',
      'active',
      creatorUserId,
    ]);
    expect(membershipInsert?.[1]).toEqual([expect.any(String), creatorUserId]);
    expect(grantsInsert?.[1]).toEqual(
      expect.arrayContaining([
        'organization:*',
        'ai-assistant',
        'file-review',
        'document-summary',
        'knowledge-search',
      ]),
    );
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
  });

  it('deletes grants before the creator membership in the same transaction', async () => {
    const { connection, execute, pool } = createDeletePool();
    const repository = new OrganizationRepository(pool);

    await expect(repository.deleteIfUnused(organizationId)).resolves.toBe(
      'deleted',
    );

    const statements = execute.mock.calls.map(([sql]) => sql.trim());
    expect(statements).toContain(
      'DELETE FROM user_access_grants WHERE organization_id = ?',
    );
    expect(statements).toContain(
      'DELETE FROM organization_members WHERE organization_id = ?',
    );
    expect(
      statements.indexOf(
        'DELETE FROM user_access_grants WHERE organization_id = ?',
      ),
    ).toBeLessThan(
      statements.indexOf(
        'DELETE FROM organization_members WHERE organization_id = ?',
      ),
    );
    expect(statements).toContain('DELETE FROM organizations WHERE id = ?');
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
  });

  it('keeps the organization when another member exists', async () => {
    const { connection, execute, pool } = createDeletePool({
      includeAdditionalMember: true,
    });
    const repository = new OrganizationRepository(pool);

    await expect(repository.deleteIfUnused(organizationId)).resolves.toBe(
      'in_use',
    );

    expect(
      execute.mock.calls.some(([sql]) => sql.trim().startsWith('DELETE')),
    ).toBe(false);
    expect(connection.commit).toHaveBeenCalledOnce();
  });
});
