import type { Pool } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';
import { PaiConversationRepository } from '../src/repositories/paiConversationRepository.js';

const ownerUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const organizationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const conversationId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const runId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const assistantMessageId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const now = new Date('2026-08-05T08:00:00.000Z');

type QueryResult = [unknown, unknown];
type QueryDispatcher = (
  sql: string,
  values: readonly unknown[] | undefined,
) => Promise<QueryResult> | QueryResult;

function createTransactionPool(dispatch: QueryDispatcher) {
  const execute = vi.fn(
    async (sql: string, values?: readonly unknown[]): Promise<QueryResult> =>
      dispatch(sql, values),
  );
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

function conversationRow() {
  return {
    conversationId,
    ownerUserId,
    scopeType: 'organization',
    organizationId,
    title: '测试会话',
    createdAt: now,
    updatedAt: now,
  };
}

describe('PaiConversationRepository', () => {
  it('lists conversations without preparing the LIMIT placeholder', async () => {
    const query = vi.fn(async (_sql: string, _values?: readonly unknown[]) => [
      [
        {
          ...conversationRow(),
          scopeType: 'platform',
          organizationId: null,
        },
      ],
      [],
    ]);
    const pool = { query } as unknown as Pool;
    const repository = new PaiConversationRepository(pool);

    await expect(
      repository.list(ownerUserId, { type: 'platform' }, 30),
    ).resolves.toMatchObject([
      {
        conversationId,
        scope: { type: 'platform' },
      },
    ]);

    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0]?.[0]).toContain('LIMIT ?');
    expect(query.mock.calls[0]?.[1]).toEqual([ownerUserId, 30]);
  });

  it('creates an Organization conversation only for an active member of an active organization', async () => {
    const { connection, execute, pool } = createTransactionPool(async (sql) => {
      if (sql.includes('FROM organizations')) {
        return [[{ id: organizationId }], []];
      }
      if (sql.includes('INSERT INTO pai_conversations')) {
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes('FROM pai_conversations AS conversations')) {
        return [[conversationRow()], []];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repository = new PaiConversationRepository(pool);

    await expect(
      repository.create({
        ownerUserId,
        scope: { type: 'organization', organizationId },
        title: '测试会话',
      }),
    ).resolves.toMatchObject({
      conversationId,
      scope: { type: 'organization', organizationId },
    });

    const accessQuery = execute.mock.calls.find(([sql]) =>
      sql.includes('FROM organizations'),
    );
    expect(accessQuery?.[0]).toContain("members.status = 'active'");
    expect(accessQuery?.[0]).toContain("organizations.status = 'active'");
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
  });

  it('does not create an Organization conversation after access is disabled', async () => {
    const { connection, execute, pool } = createTransactionPool(async (sql) => {
      if (sql.includes('FROM organizations')) return [[], []];
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repository = new PaiConversationRepository(pool);

    await expect(
      repository.create({
        ownerUserId,
        scope: { type: 'organization', organizationId },
        title: '不可创建',
      }),
    ).resolves.toBeNull();

    expect(
      execute.mock.calls.some(([sql]) =>
        sql.includes('INSERT INTO pai_conversations'),
      ),
    ).toBe(false);
    expect(connection.commit).toHaveBeenCalledOnce();
  });

  it('locks the conversation and creates one ordered turn atomically', async () => {
    const { connection, execute, pool } = createTransactionPool(async (sql) => {
      if (
        sql.includes('FROM pai_conversations AS conversations') &&
        sql.includes('FOR UPDATE')
      ) {
        return [[conversationRow()], []];
      }
      if (sql.includes('INNER JOIN pai_messages AS user_messages')) {
        return [[], []];
      }
      if (sql.includes("status IN ('pending', 'streaming')")) {
        return [[], []];
      }
      if (sql.includes('MAX(turn_no)')) {
        return [[{ nextTurnNo: 3 }], []];
      }
      if (
        sql.includes('INSERT INTO pai_runs') ||
        sql.includes('INSERT INTO pai_messages') ||
        sql.includes('UPDATE pai_conversations')
      ) {
        return [{ affectedRows: 1 }, []];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repository = new PaiConversationRepository(pool);

    const result = await repository.startRun({
      ownerUserId,
      conversationId,
      idempotencyKey: 'request-3',
      content: '第三次提问',
      knowledgeEnabled: true,
      webSearchEnabled: false,
      modelProvider: 'deepseek',
      modelName: 'deepseek-chat',
      traceId: 'trace-3',
    });

    expect(result).toMatchObject({
      kind: 'started',
      run: { turnNo: 3, status: 'streaming' },
    });
    const runInsert = execute.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO pai_runs'),
    );
    expect(runInsert?.[1]).toEqual([
      expect.any(String),
      conversationId,
      3,
      'request-3',
      true,
      false,
      'deepseek',
      'deepseek-chat',
      'trace-3',
    ]);
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
  });

  it('replays the same idempotency key before checking for another active run', async () => {
    const existingRun = {
      runId,
      turnNo: 2,
      userMessageId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      assistantMessageId,
      status: 'completed',
    };
    const { execute, pool } = createTransactionPool(async (sql) => {
      if (
        sql.includes('FROM pai_conversations AS conversations') &&
        sql.includes('FOR UPDATE')
      ) {
        return [[conversationRow()], []];
      }
      if (sql.includes('INNER JOIN pai_messages AS user_messages')) {
        return [[existingRun], []];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repository = new PaiConversationRepository(pool);

    await expect(
      repository.startRun({
        ownerUserId,
        conversationId,
        idempotencyKey: 'request-2',
        content: '重复请求',
        knowledgeEnabled: false,
        webSearchEnabled: false,
        modelProvider: 'deepseek',
        modelName: 'deepseek-chat',
      }),
    ).resolves.toEqual({ kind: 'replayed', run: existingRun });

    expect(
      execute.mock.calls.some(([sql]) => sql.includes('INSERT INTO pai_runs')),
    ).toBe(false);
  });

  it('stores partial content and sources when a run is aborted', async () => {
    const { connection, execute, pool } = createTransactionPool(async (sql) => {
      if (sql.includes('SELECT conversation_id AS conversationId')) {
        return [[{ conversationId }], []];
      }
      if (
        sql.includes('FROM pai_conversations') &&
        sql.includes('FOR UPDATE')
      ) {
        return [[{ id: conversationId }], []];
      }
      if (sql.includes('FROM pai_runs AS runs') && sql.includes('FOR UPDATE')) {
        return [
          [
            {
              conversationId,
              status: 'streaming',
              assistantMessageId,
            },
          ],
          [],
        ];
      }
      if (sql.includes('UPDATE') || sql.includes('INSERT INTO')) {
        return [{ affectedRows: 1 }, []];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repository = new PaiConversationRepository(pool);

    await expect(
      repository.completeRun({
        runId,
        status: 'aborted',
        content: '已经生成的部分回答',
        errorCode: 'USER_ABORTED',
        sources: [
          {
            sourceId: 'source-1',
            sourceType: 'web',
            title: '来源一',
            sourceUrl: 'https://example.test/source-1',
          },
        ],
      }),
    ).resolves.toBe('completed');

    const messageUpdate = execute.mock.calls.find(([sql]) =>
      sql.includes('UPDATE pai_messages'),
    );
    expect(messageUpdate?.[1]).toEqual([
      'aborted',
      '已经生成的部分回答',
      assistantMessageId,
    ]);
    const sourceInsert = execute.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO pai_message_sources'),
    );
    expect(sourceInsert?.[1]).toEqual([
      assistantMessageId,
      'source-1',
      'web',
      '来源一',
      'https://example.test/source-1',
      null,
      null,
      null,
      1,
    ]);
    expect(connection.commit).toHaveBeenCalledOnce();
  });

  it('reconstructs ordered history and attaches sources to their message', async () => {
    const execute = vi.fn(async (sql: string): Promise<QueryResult> => {
      if (sql.includes('FROM pai_conversations AS conversations')) {
        return [[conversationRow()], []];
      }
      if (
        sql.includes('FROM pai_runs AS runs') &&
        sql.includes('messages.role')
      ) {
        return [
          [
            {
              runId,
              turnNo: 1,
              runStatus: 'completed',
              knowledgeEnabled: 0,
              webSearchEnabled: 1,
              modelProvider: 'deepseek',
              modelName: 'deepseek-chat',
              startedAt: now,
              runCompletedAt: now,
              messageId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
              role: 'user',
              messageStatus: 'completed',
              content: '问题',
              messageCreatedAt: now,
              messageCompletedAt: now,
            },
            {
              runId,
              turnNo: 1,
              runStatus: 'completed',
              knowledgeEnabled: 0,
              webSearchEnabled: 1,
              modelProvider: 'deepseek',
              modelName: 'deepseek-chat',
              startedAt: now,
              runCompletedAt: now,
              messageId: assistantMessageId,
              role: 'assistant',
              messageStatus: 'completed',
              content: '回答',
              messageCreatedAt: now,
              messageCompletedAt: now,
            },
          ],
          [],
        ];
      }
      if (sql.includes('FROM pai_message_sources AS sources')) {
        return [
          [
            {
              messageId: assistantMessageId,
              sourceId: 'source-1',
              sourceType: 'web',
              title: '来源一',
              sourceUrl: 'https://example.test/source-1',
              snippet: null,
              publishedAt: null,
              sourceUpdatedAt: null,
              ordinal: 1,
            },
          ],
          [],
        ];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repository = new PaiConversationRepository({
      execute,
    } as unknown as Pool);

    const history = await repository.getHistory(ownerUserId, conversationId);

    expect(history?.turns).toHaveLength(1);
    expect(history?.turns[0]?.messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
    ]);
    expect(history?.turns[0]?.messages[1]?.sources).toEqual([
      expect.objectContaining({ sourceId: 'source-1', ordinal: 1 }),
    ]);
  });

  it('updates a title only after locking an accessible conversation', async () => {
    const { connection, execute, pool } = createTransactionPool(async (sql) => {
      if (
        sql.includes('FROM pai_conversations AS conversations') &&
        sql.includes('FOR UPDATE')
      ) {
        return [[conversationRow()], []];
      }
      if (sql.includes('UPDATE pai_conversations')) {
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes('FROM pai_conversations AS conversations')) {
        return [[{ ...conversationRow(), title: '新标题' }], []];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repository = new PaiConversationRepository(pool);

    await expect(
      repository.updateTitle(ownerUserId, conversationId, '新标题'),
    ).resolves.toMatchObject({ title: '新标题' });

    expect(
      execute.mock.calls.find(([sql]) =>
        sql.includes('UPDATE pai_conversations'),
      )?.[1],
    ).toEqual(['新标题', conversationId]);
    expect(connection.commit).toHaveBeenCalledOnce();
  });

  it('deletes only the conversation row and relies on the single cascade chain', async () => {
    const { execute, pool } = createTransactionPool(async (sql) => {
      if (
        sql.includes('FROM pai_conversations AS conversations') &&
        sql.includes('FOR UPDATE')
      ) {
        return [[conversationRow()], []];
      }
      if (sql.includes('DELETE FROM pai_conversations')) {
        return [{ affectedRows: 1 }, []];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repository = new PaiConversationRepository(pool);

    await expect(repository.delete(ownerUserId, conversationId)).resolves.toBe(
      'deleted',
    );

    const deleteStatements = execute.mock.calls
      .map(([sql]) => sql.trim())
      .filter((sql) => sql.startsWith('DELETE'));
    expect(deleteStatements).toEqual([
      'DELETE FROM pai_conversations WHERE id = ?',
    ]);
  });
});
