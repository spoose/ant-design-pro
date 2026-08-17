import { randomUUID } from 'node:crypto';
import type { Pool } from 'mysql2/promise';
import { databaseOperation } from '../db/databaseOperation.js';
import { withTransaction } from '../db/transaction.js';

export type CreateKnowledgeDocumentInput = {
  createdByUserId: string;
  fileName: string;
  content: string;
  scope:
    | { type: 'personal'; ownerUserId: string }
    | { type: 'organization'; organizationId: string };
};

export type KnowledgeDocument = {
  sourceId: string;
  documentId: string;
  fileName: string;
  scopeType: 'personal' | 'organization';
  organizationId: string | null;
  characterCount: number;
  createdAt: Date;
};

export class KnowledgeDocumentRepository {
  constructor(private readonly pool: Pool) {}

  async create(
    input: CreateKnowledgeDocumentInput,
  ): Promise<KnowledgeDocument> {
    const sourceId = randomUUID();
    const documentId = randomUUID();
    const createdAt = new Date();
    const organizationId =
      input.scope.type === 'organization' ? input.scope.organizationId : null;
    const ownerUserId =
      input.scope.type === 'personal' ? input.scope.ownerUserId : null;
    const mediaType = input.fileName.toLowerCase().endsWith('.md')
      ? 'text/markdown'
      : 'text/plain';

    await databaseOperation(() =>
      withTransaction(this.pool, async (connection) => {
        await connection.execute(
          `
            INSERT INTO knowledge_sources (
              id,
              scope_type,
              owner_user_id,
              organization_id,
              created_by_user_id,
              name,
              media_type,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            sourceId,
            input.scope.type,
            ownerUserId,
            organizationId,
            input.createdByUserId,
            input.fileName,
            mediaType,
            createdAt,
          ],
        );
        await connection.execute(
          `
            INSERT INTO knowledge_documents (
              id,
              source_id,
              content,
              character_count,
              created_at
            ) VALUES (?, ?, ?, ?, ?)
          `,
          [
            documentId,
            sourceId,
            input.content,
            input.content.length,
            createdAt,
          ],
        );
      }),
    );

    return {
      sourceId,
      documentId,
      fileName: input.fileName,
      scopeType: input.scope.type,
      organizationId,
      characterCount: input.content.length,
      createdAt,
    };
  }
}
