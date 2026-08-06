import { randomUUID } from 'node:crypto';
import type {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';
import { databaseOperation } from '../db/databaseOperation.js';
import { withTransaction } from '../db/transaction.js';

export type PaiConversationScope =
  | { type: 'platform' }
  | { type: 'organization'; organizationId: string };

export type PaiRunStatus =
  | 'pending'
  | 'streaming'
  | 'completed'
  | 'failed'
  | 'aborted';

export type PaiMessageStatus = PaiRunStatus;

export interface PaiConversationSummary {
  conversationId: string;
  ownerUserId: string;
  scope: PaiConversationScope;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaiMessageSource {
  sourceId: string;
  sourceType: 'knowledge' | 'web';
  title: string;
  sourceUrl: string | null;
  snippet: string | null;
  publishedAt: Date | null;
  sourceUpdatedAt: Date | null;
  ordinal: number;
}

export interface PaiMessage {
  messageId: string;
  role: 'user' | 'assistant';
  status: PaiMessageStatus;
  content: string;
  createdAt: Date;
  completedAt: Date | null;
  sources: PaiMessageSource[];
}

export interface PaiTurn {
  runId: string;
  turnNo: number;
  status: PaiRunStatus;
  errorCode: string | null;
  knowledgeEnabled: boolean;
  webSearchEnabled: boolean;
  modelProvider: string;
  modelName: string;
  startedAt: Date;
  completedAt: Date | null;
  messages: PaiMessage[];
}

export interface PaiConversationHistory {
  conversation: PaiConversationSummary;
  turns: PaiTurn[];
}

export interface CreatePaiConversationInput {
  ownerUserId: string;
  scope: PaiConversationScope;
  title: string;
}

export interface StartPaiRunInput {
  ownerUserId: string;
  conversationId: string;
  idempotencyKey: string;
  content: string;
  knowledgeEnabled: boolean;
  webSearchEnabled: boolean;
  modelProvider: string;
  modelName: string;
  traceId?: string | undefined;
}

export interface PaiRunReference {
  runId: string;
  turnNo: number;
  userMessageId: string;
  assistantMessageId: string;
  status: PaiRunStatus;
}

export type StartPaiRunResult =
  | { kind: 'started'; run: PaiRunReference }
  | { kind: 'replayed'; run: PaiRunReference }
  | { kind: 'conversation_unavailable' }
  | { kind: 'run_in_progress' };

export interface CompletePaiRunSourceInput {
  sourceId: string;
  sourceType: 'knowledge' | 'web';
  title: string;
  sourceUrl?: string | null | undefined;
  snippet?: string | null | undefined;
  publishedAt?: Date | null | undefined;
  sourceUpdatedAt?: Date | null | undefined;
}

export interface CompletePaiRunInput {
  runId: string;
  status: 'completed' | 'failed' | 'aborted';
  content: string;
  inputTokens?: number | null | undefined;
  outputTokens?: number | null | undefined;
  errorCode?: string | null | undefined;
  sources?: readonly CompletePaiRunSourceInput[] | undefined;
}

export type CompletePaiRunResult =
  | 'completed'
  | 'run_not_found'
  | 'already_terminal';

export interface PaiConversationRepositoryPort {
  create(
    input: CreatePaiConversationInput,
  ): Promise<PaiConversationSummary | null>;
  list(
    ownerUserId: string,
    scope: PaiConversationScope,
    limit: number,
  ): Promise<PaiConversationSummary[]>;
  updateTitle(
    ownerUserId: string,
    conversationId: string,
    title: string,
  ): Promise<PaiConversationSummary | null>;
  getHistory(
    ownerUserId: string,
    conversationId: string,
  ): Promise<PaiConversationHistory | null>;
  delete(
    ownerUserId: string,
    conversationId: string,
  ): Promise<'deleted' | 'not_found'>;
  startRun(input: StartPaiRunInput): Promise<StartPaiRunResult>;
  saveAssistantContent(
    runId: string,
    content: string,
  ): Promise<'saved' | 'run_not_active'>;
  completeRun(input: CompletePaiRunInput): Promise<CompletePaiRunResult>;
}

interface ConversationRow extends RowDataPacket {
  conversationId: string;
  ownerUserId: string;
  scopeType: 'platform' | 'organization';
  organizationId: string | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ExistingRunRow extends RowDataPacket, PaiRunReference {}

interface ActiveRunRow extends RowDataPacket {
  runId: string;
}

interface NextTurnRow extends RowDataPacket {
  nextTurnNo: number;
}

interface RunLockRow extends RowDataPacket {
  conversationId: string;
  status: PaiRunStatus;
  assistantMessageId: string;
}

interface RunConversationRow extends RowDataPacket {
  conversationId: string;
}

interface HistoryMessageRow extends RowDataPacket {
  runId: string;
  turnNo: number;
  runStatus: PaiRunStatus;
  errorCode: string | null;
  knowledgeEnabled: number;
  webSearchEnabled: number;
  modelProvider: string;
  modelName: string;
  startedAt: Date;
  runCompletedAt: Date | null;
  messageId: string;
  role: 'user' | 'assistant';
  messageStatus: PaiMessageStatus;
  content: string;
  messageCreatedAt: Date;
  messageCompletedAt: Date | null;
}

interface SourceRow extends RowDataPacket, PaiMessageSource {
  messageId: string;
}

function mapConversation(row: ConversationRow): PaiConversationSummary {
  if (row.scopeType === 'organization' && !row.organizationId) {
    throw new Error('Organization conversation is missing organizationId');
  }
  return {
    conversationId: row.conversationId,
    ownerUserId: row.ownerUserId,
    scope:
      row.scopeType === 'platform'
        ? { type: 'platform' }
        : {
            type: 'organization',
            organizationId: row.organizationId as string,
          },
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const conversationSelect = `
  SELECT
    conversations.id AS conversationId,
    conversations.owner_user_id AS ownerUserId,
    conversations.scope_type AS scopeType,
    conversations.organization_id AS organizationId,
    conversations.title,
    conversations.created_at AS createdAt,
    conversations.updated_at AS updatedAt
  FROM pai_conversations AS conversations
`;

export class PaiConversationRepository
  implements PaiConversationRepositoryPort
{
  constructor(private readonly pool: Pool) {}

  async create(
    input: CreatePaiConversationInput,
  ): Promise<PaiConversationSummary | null> {
    return databaseOperation(() =>
      withTransaction(this.pool, async (connection) => {
        if (
          input.scope.type === 'organization' &&
          !(await this.hasOrganizationAccess(
            connection,
            input.ownerUserId,
            input.scope.organizationId,
          ))
        ) {
          return null;
        }

        const conversationId = randomUUID();
        const organizationId =
          input.scope.type === 'organization'
            ? input.scope.organizationId
            : null;
        await connection.execute<ResultSetHeader>(
          `
            INSERT INTO pai_conversations (
              id,
              owner_user_id,
              scope_type,
              organization_id,
              title
            ) VALUES (?, ?, ?, ?, ?)
          `,
          [
            conversationId,
            input.ownerUserId,
            input.scope.type,
            organizationId,
            input.title,
          ],
        );
        const [rows] = await connection.execute<ConversationRow[]>(
          `${conversationSelect} WHERE conversations.id = ? LIMIT 1`,
          [conversationId],
        );
        return rows[0] ? mapConversation(rows[0]) : null;
      }),
    );
  }

  async list(
    ownerUserId: string,
    scope: PaiConversationScope,
    limit: number,
  ): Promise<PaiConversationSummary[]> {
    const scopeCondition =
      scope.type === 'platform'
        ? `
          conversations.scope_type = 'platform'
          AND conversations.organization_id IS NULL
        `
        : `
          conversations.scope_type = 'organization'
          AND conversations.organization_id = ?
          AND EXISTS (
            SELECT 1
            FROM organizations
            INNER JOIN organization_members AS members
              ON members.organization_id = organizations.id
              AND members.user_id = conversations.owner_user_id
              AND members.status = 'active'
            WHERE organizations.id = conversations.organization_id
              AND organizations.status = 'active'
          )
        `;
    const values =
      scope.type === 'platform'
        ? [ownerUserId, limit]
        : [ownerUserId, scope.organizationId, limit];
    const [rows] = await databaseOperation(() =>
      // query() 仍会转义占位参数，并避免原生 prepared statement 在 LIMIT ? 上返回 ER_WRONG_ARGUMENTS。
      this.pool.query<ConversationRow[]>(
        `
          ${conversationSelect}
          WHERE conversations.owner_user_id = ?
            AND ${scopeCondition}
          ORDER BY conversations.updated_at DESC, conversations.id DESC
          LIMIT ?
        `,
        values,
      ),
    );
    return rows.map(mapConversation);
  }

  async getHistory(
    ownerUserId: string,
    conversationId: string,
  ): Promise<PaiConversationHistory | null> {
    const [conversations] = await databaseOperation(() =>
      this.pool.execute<ConversationRow[]>(
        `
          ${conversationSelect}
          WHERE conversations.id = ?
            AND conversations.owner_user_id = ?
            AND (
              conversations.scope_type = 'platform'
              OR EXISTS (
                SELECT 1
                FROM organizations
                INNER JOIN organization_members AS members
                  ON members.organization_id = organizations.id
                  AND members.user_id = conversations.owner_user_id
                  AND members.status = 'active'
                WHERE organizations.id = conversations.organization_id
                  AND organizations.status = 'active'
              )
            )
          LIMIT 1
        `,
        [conversationId, ownerUserId],
      ),
    );
    const conversation = conversations[0];
    if (!conversation) return null;

    const [[messageRows], [sourceRows]] = await Promise.all([
      databaseOperation(() =>
        this.pool.execute<HistoryMessageRow[]>(
          `
            SELECT
              runs.id AS runId,
              runs.turn_no AS turnNo,
              runs.status AS runStatus,
              runs.error_code AS errorCode,
              runs.knowledge_enabled AS knowledgeEnabled,
              runs.web_search_enabled AS webSearchEnabled,
              runs.model_provider AS modelProvider,
              runs.model_name AS modelName,
              runs.started_at AS startedAt,
              runs.completed_at AS runCompletedAt,
              messages.id AS messageId,
              messages.role,
              messages.status AS messageStatus,
              messages.content,
              messages.created_at AS messageCreatedAt,
              messages.completed_at AS messageCompletedAt
            FROM pai_runs AS runs
            INNER JOIN pai_messages AS messages ON messages.run_id = runs.id
            WHERE runs.conversation_id = ?
            ORDER BY runs.turn_no, FIELD(messages.role, 'user', 'assistant')
          `,
          [conversationId],
        ),
      ),
      databaseOperation(() =>
        this.pool.execute<SourceRow[]>(
          `
            SELECT
              sources.message_id AS messageId,
              sources.source_id AS sourceId,
              sources.source_type AS sourceType,
              sources.title,
              sources.source_url AS sourceUrl,
              sources.snippet,
              sources.published_at AS publishedAt,
              sources.source_updated_at AS sourceUpdatedAt,
              sources.ordinal
            FROM pai_message_sources AS sources
            INNER JOIN pai_messages AS messages ON messages.id = sources.message_id
            INNER JOIN pai_runs AS runs ON runs.id = messages.run_id
            WHERE runs.conversation_id = ?
            ORDER BY runs.turn_no, sources.ordinal
          `,
          [conversationId],
        ),
      ),
    ]);

    const sourcesByMessage = new Map<string, PaiMessageSource[]>();
    for (const row of sourceRows) {
      const sources = sourcesByMessage.get(row.messageId) ?? [];
      sources.push({
        sourceId: row.sourceId,
        sourceType: row.sourceType,
        title: row.title,
        sourceUrl: row.sourceUrl,
        snippet: row.snippet,
        publishedAt: row.publishedAt,
        sourceUpdatedAt: row.sourceUpdatedAt,
        ordinal: row.ordinal,
      });
      sourcesByMessage.set(row.messageId, sources);
    }

    const turns = new Map<string, PaiTurn>();
    for (const row of messageRows) {
      let turn = turns.get(row.runId);
      if (!turn) {
        turn = {
          runId: row.runId,
          turnNo: row.turnNo,
          status: row.runStatus,
          errorCode: row.errorCode,
          knowledgeEnabled: Boolean(row.knowledgeEnabled),
          webSearchEnabled: Boolean(row.webSearchEnabled),
          modelProvider: row.modelProvider,
          modelName: row.modelName,
          startedAt: row.startedAt,
          completedAt: row.runCompletedAt,
          messages: [],
        };
        turns.set(row.runId, turn);
      }
      turn.messages.push({
        messageId: row.messageId,
        role: row.role,
        status: row.messageStatus,
        content: row.content,
        createdAt: row.messageCreatedAt,
        completedAt: row.messageCompletedAt,
        sources: sourcesByMessage.get(row.messageId) ?? [],
      });
    }

    return {
      conversation: mapConversation(conversation),
      turns: [...turns.values()],
    };
  }

  async updateTitle(
    ownerUserId: string,
    conversationId: string,
    title: string,
  ): Promise<PaiConversationSummary | null> {
    return databaseOperation(() =>
      withTransaction(this.pool, async (connection) => {
        // 使用与读取、删除一致的锁定查询，标题更新不能绕过 Owner 和 Organization 状态。
        const conversation = await this.lockAccessibleConversation(
          connection,
          ownerUserId,
          conversationId,
        );
        if (!conversation) return null;

        await connection.execute<ResultSetHeader>(
          `
            UPDATE pai_conversations
            SET title = ?, updated_at = CURRENT_TIMESTAMP(3)
            WHERE id = ?
          `,
          [title, conversationId],
        );
        const [rows] = await connection.execute<ConversationRow[]>(
          `${conversationSelect} WHERE conversations.id = ? LIMIT 1`,
          [conversationId],
        );
        return rows[0] ? mapConversation(rows[0]) : null;
      }),
    );
  }

  async delete(
    ownerUserId: string,
    conversationId: string,
  ): Promise<'deleted' | 'not_found'> {
    return databaseOperation(() =>
      withTransaction(this.pool, async (connection) => {
        const conversation = await this.lockAccessibleConversation(
          connection,
          ownerUserId,
          conversationId,
        );
        if (!conversation) return 'not_found';

        await connection.execute<ResultSetHeader>(
          'DELETE FROM pai_conversations WHERE id = ?',
          [conversationId],
        );
        return 'deleted';
      }),
    );
  }

  async startRun(input: StartPaiRunInput): Promise<StartPaiRunResult> {
    return databaseOperation(() =>
      withTransaction(this.pool, async (connection) => {
        const conversation = await this.lockAccessibleConversation(
          connection,
          input.ownerUserId,
          input.conversationId,
        );
        if (!conversation) return { kind: 'conversation_unavailable' };

        const [existingRuns] = await connection.execute<ExistingRunRow[]>(
          `
            SELECT
              runs.id AS runId,
              runs.turn_no AS turnNo,
              runs.status,
              user_messages.id AS userMessageId,
              assistant_messages.id AS assistantMessageId
            FROM pai_runs AS runs
            INNER JOIN pai_messages AS user_messages
              ON user_messages.run_id = runs.id AND user_messages.role = 'user'
            INNER JOIN pai_messages AS assistant_messages
              ON assistant_messages.run_id = runs.id AND assistant_messages.role = 'assistant'
            WHERE runs.conversation_id = ? AND runs.idempotency_key = ?
            LIMIT 1
          `,
          [input.conversationId, input.idempotencyKey],
        );
        if (existingRuns[0]) {
          return { kind: 'replayed', run: existingRuns[0] };
        }

        const [activeRuns] = await connection.execute<ActiveRunRow[]>(
          `
            SELECT id AS runId
            FROM pai_runs
            WHERE conversation_id = ? AND status IN ('pending', 'streaming')
            LIMIT 1
            FOR UPDATE
          `,
          [input.conversationId],
        );
        if (activeRuns[0]) return { kind: 'run_in_progress' };

        const [turnRows] = await connection.execute<NextTurnRow[]>(
          `
            SELECT COALESCE(MAX(turn_no), 0) + 1 AS nextTurnNo
            FROM pai_runs
            WHERE conversation_id = ?
          `,
          [input.conversationId],
        );
        const turnNo = Number(turnRows[0]?.nextTurnNo ?? 1);
        const runId = randomUUID();
        const userMessageId = randomUUID();
        const assistantMessageId = randomUUID();

        await connection.execute<ResultSetHeader>(
          `
            INSERT INTO pai_runs (
              id,
              conversation_id,
              turn_no,
              idempotency_key,
              status,
              knowledge_enabled,
              web_search_enabled,
              model_provider,
              model_name,
              trace_id
            ) VALUES (?, ?, ?, ?, 'streaming', ?, ?, ?, ?, ?)
          `,
          [
            runId,
            input.conversationId,
            turnNo,
            input.idempotencyKey,
            input.knowledgeEnabled,
            input.webSearchEnabled,
            input.modelProvider,
            input.modelName,
            input.traceId ?? null,
          ],
        );
        await connection.execute<ResultSetHeader>(
          `
            INSERT INTO pai_messages (
              id,
              run_id,
              role,
              status,
              content,
              completed_at
            ) VALUES
              (?, ?, 'user', 'completed', ?, CURRENT_TIMESTAMP(3)),
              (?, ?, 'assistant', 'streaming', '', NULL)
          `,
          [userMessageId, runId, input.content, assistantMessageId, runId],
        );
        await connection.execute<ResultSetHeader>(
          'UPDATE pai_conversations SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
          [input.conversationId],
        );

        return {
          kind: 'started',
          run: {
            runId,
            turnNo,
            userMessageId,
            assistantMessageId,
            status: 'streaming',
          },
        };
      }),
    );
  }

  async saveAssistantContent(
    runId: string,
    content: string,
  ): Promise<'saved' | 'run_not_active'> {
    const [result] = await databaseOperation(() =>
      this.pool.execute<ResultSetHeader>(
        `
          UPDATE pai_messages AS messages
          INNER JOIN pai_runs AS runs ON runs.id = messages.run_id
          SET messages.content = ?
          WHERE runs.id = ?
            AND runs.status IN ('pending', 'streaming')
            AND messages.role = 'assistant'
        `,
        [content, runId],
      ),
    );
    return result.affectedRows > 0 ? 'saved' : 'run_not_active';
  }

  async completeRun(input: CompletePaiRunInput): Promise<CompletePaiRunResult> {
    return databaseOperation(() =>
      withTransaction(this.pool, async (connection) => {
        const [runConversations] = await connection.execute<
          RunConversationRow[]
        >(
          `
              SELECT conversation_id AS conversationId
              FROM pai_runs
              WHERE id = ?
              LIMIT 1
            `,
          [input.runId],
        );
        const conversationId = runConversations[0]?.conversationId;
        if (!conversationId) return 'run_not_found';

        // 与 startRun/delete 保持父级优先的加锁顺序，避免交叉更新死锁。
        const [conversations] = await connection.execute<RowDataPacket[]>(
          `
            SELECT id
            FROM pai_conversations
            WHERE id = ?
            LIMIT 1
            FOR UPDATE
          `,
          [conversationId],
        );
        if (!conversations[0]) return 'run_not_found';

        const [runs] = await connection.execute<RunLockRow[]>(
          `
            SELECT
              runs.conversation_id AS conversationId,
              runs.status,
              messages.id AS assistantMessageId
            FROM pai_runs AS runs
            INNER JOIN pai_messages AS messages
              ON messages.run_id = runs.id AND messages.role = 'assistant'
            WHERE runs.id = ?
            LIMIT 1
            FOR UPDATE
          `,
          [input.runId],
        );
        const run = runs[0];
        if (!run) return 'run_not_found';
        if (run.status !== 'pending' && run.status !== 'streaming') {
          return 'already_terminal';
        }

        await connection.execute<ResultSetHeader>(
          `
            UPDATE pai_messages
            SET status = ?, content = ?, completed_at = CURRENT_TIMESTAMP(3)
            WHERE id = ?
          `,
          [input.status, input.content, run.assistantMessageId],
        );

        const sources = input.sources ?? [];
        if (sources.length > 0) {
          const placeholders = sources
            .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .join(', ');
          const values = sources.flatMap((source, index) => [
            run.assistantMessageId,
            source.sourceId,
            source.sourceType,
            source.title,
            source.sourceUrl ?? null,
            source.snippet ?? null,
            source.publishedAt ?? null,
            source.sourceUpdatedAt ?? null,
            index + 1,
          ]);
          await connection.execute<ResultSetHeader>(
            `
              INSERT INTO pai_message_sources (
                message_id,
                source_id,
                source_type,
                title,
                source_url,
                snippet,
                published_at,
                source_updated_at,
                ordinal
              ) VALUES ${placeholders}
            `,
            values,
          );
        }

        await connection.execute<ResultSetHeader>(
          `
            UPDATE pai_runs
            SET
              status = ?,
              input_tokens = ?,
              output_tokens = ?,
              error_code = ?,
              completed_at = CURRENT_TIMESTAMP(3)
            WHERE id = ?
          `,
          [
            input.status,
            input.inputTokens ?? null,
            input.outputTokens ?? null,
            input.errorCode ?? null,
            input.runId,
          ],
        );
        await connection.execute<ResultSetHeader>(
          'UPDATE pai_conversations SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
          [conversationId],
        );
        return 'completed';
      }),
    );
  }

  private async hasOrganizationAccess(
    connection: PoolConnection,
    ownerUserId: string,
    organizationId: string,
  ): Promise<boolean> {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `
        SELECT organizations.id
        FROM organizations
        INNER JOIN organization_members AS members
          ON members.organization_id = organizations.id
          AND members.user_id = ?
          AND members.status = 'active'
        WHERE organizations.id = ?
          AND organizations.status = 'active'
        LIMIT 1
        FOR UPDATE
      `,
      [ownerUserId, organizationId],
    );
    return Boolean(rows[0]);
  }

  private async lockAccessibleConversation(
    connection: PoolConnection,
    ownerUserId: string,
    conversationId: string,
  ): Promise<ConversationRow | null> {
    const [rows] = await connection.execute<ConversationRow[]>(
      `
        ${conversationSelect}
        WHERE conversations.id = ?
          AND conversations.owner_user_id = ?
          AND (
            conversations.scope_type = 'platform'
            OR EXISTS (
              SELECT 1
              FROM organizations
              INNER JOIN organization_members AS members
                ON members.organization_id = organizations.id
                AND members.user_id = conversations.owner_user_id
                AND members.status = 'active'
              WHERE organizations.id = conversations.organization_id
                AND organizations.status = 'active'
            )
          )
        LIMIT 1
        FOR UPDATE
      `,
      [conversationId, ownerUserId],
    );
    return rows[0] ?? null;
  }
}
