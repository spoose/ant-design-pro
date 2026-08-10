import type {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';
import { UserRepository } from '../src/repositories/userRepository.js';

function createRepository(accessRows: RowDataPacket[]) {
  const execute = vi
    .fn<PoolConnection['execute']>()
    .mockResolvedValueOnce([accessRows, []])
    .mockResolvedValueOnce([{ affectedRows: 1 } as ResultSetHeader, []]);
  const connection = {
    beginTransaction: vi.fn(),
    execute,
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  } as unknown as PoolConnection;
  const pool = {
    getConnection: vi.fn().mockResolvedValue(connection),
  } as unknown as Pool;
  return { repository: new UserRepository(pool), connection, execute };
}

describe('UserRepository.setDefaultOrganization', () => {
  it('locks the effective access rows before updating the preference', async () => {
    const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const organizationId = '11111111-1111-4111-8111-111111111111';
    const { repository, connection, execute } = createRepository([
      { userId } as unknown as RowDataPacket,
    ]);

    await expect(
      repository.setDefaultOrganization(userId, organizationId),
    ).resolves.toBe('updated');

    expect(execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("members.status = 'active'"),
      [organizationId, userId],
    );
    expect(execute.mock.calls[0]?.[0]).toContain(
      "organizations.status = 'active'",
    );
    expect(execute.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SET default_organization_id = ?'),
      [organizationId, userId],
    );
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('does not update when effective Organization access is absent', async () => {
    const { repository, connection, execute } = createRepository([]);

    await expect(
      repository.setDefaultOrganization(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        '11111111-1111-4111-8111-111111111111',
      ),
    ).resolves.toBe('organization_forbidden');

    expect(execute).toHaveBeenCalledOnce();
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledOnce();
  });
});

describe('UserRepository.updateCurrentUserProfile', () => {
  it('updates display_name and avatar_url for an active user', async () => {
    const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const execute = vi
      .fn()
      .mockResolvedValueOnce([{ affectedRows: 1 } as ResultSetHeader, []])
      .mockResolvedValueOnce([
        [
          {
            userId,
            username: 'ada',
            email: 'ada@example.com',
            name: 'Ada',
            avatar: 'https://example.com/a.png',
            status: 'active',
            isSuperAdmin: 0,
            defaultOrganizationId: null,
            tokenVersion: 0,
            passwordHash: 'hash',
          },
        ],
        [],
      ])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[], []]);
    const pool = {
      execute,
      getConnection: vi.fn(),
    } as unknown as Pool;
    const repository = new UserRepository(pool);

    const user = await repository.updateCurrentUserProfile(userId, {
      name: 'Ada',
      avatar: 'https://example.com/a.png',
    });

    expect(execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('display_name = ?'),
      ['Ada', 'https://example.com/a.png', userId],
    );
    expect(execute.mock.calls[0]?.[0]).toContain('avatar_url = ?');
    expect(user).toMatchObject({
      userId,
      name: 'Ada',
      avatar: 'https://example.com/a.png',
    });
  });
});
