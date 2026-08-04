import { randomUUID } from 'node:crypto';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { databaseOperation } from '../db/databaseOperation.js';
import { withTransaction } from '../db/transaction.js';
import { AppError } from '../errors/appError.js';
import {
  SUPER_ADMIN_ORGANIZATION_PERMISSIONS,
  SUPER_ADMIN_ORGANIZATION_SKILL_CODES,
} from '../permissions/catalog.js';

export type OrganizationStatus = 'active' | 'disabled';

export interface OrganizationSummary {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  status: OrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationInput {
  organizationCode: string;
  organizationName: string;
  status: OrganizationStatus;
}

export interface UpdateOrganizationInput {
  organizationName?: string | undefined;
  status?: OrganizationStatus | undefined;
}

export interface OrganizationBootstrapAccess {
  creatorUserId: string;
  permissions: readonly string[];
  skillCodes: readonly string[];
}

export type DeleteOrganizationResult = 'deleted' | 'not_found' | 'in_use';

export interface OrganizationRepositoryPort {
  list(): Promise<OrganizationSummary[]>;
  create(
    input: CreateOrganizationInput,
    bootstrapAccess: OrganizationBootstrapAccess,
  ): Promise<OrganizationSummary>;
  update(
    organizationId: string,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationSummary | null>;
  deleteIfUnused(organizationId: string): Promise<DeleteOrganizationResult>;
}

interface OrganizationRow extends RowDataPacket, OrganizationSummary {}

interface OrganizationLockRow extends RowDataPacket {
  organizationId: string;
  createdBy: string | null;
}

interface OrganizationMemberRow extends RowDataPacket {
  userId: string;
}

interface OrganizationGrantRow extends RowDataPacket {
  userId: string;
  createdBy: string;
  grantType: 'permission' | 'skill';
  grantCode: string;
}

interface MySqlError extends Error {
  code?: string;
}

const organizationSelect = `
  SELECT
    id AS organizationId,
    code AS organizationCode,
    name AS organizationName,
    status,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM organizations
`;

const isDuplicateEntry = (error: unknown): error is MySqlError =>
  error instanceof Error &&
  'code' in error &&
  (error as MySqlError).code === 'ER_DUP_ENTRY';

export class OrganizationRepository implements OrganizationRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<OrganizationSummary[]> {
    const [rows] = await databaseOperation(() =>
      this.pool.execute<OrganizationRow[]>(
        `${organizationSelect} ORDER BY code, id`,
      ),
    );
    return rows;
  }

  async create(
    input: CreateOrganizationInput,
    bootstrapAccess: OrganizationBootstrapAccess,
  ): Promise<OrganizationSummary> {
    const organizationId = randomUUID();
    try {
      await databaseOperation(() =>
        withTransaction(this.pool, async (connection) => {
          await connection.execute<ResultSetHeader>(
            `
              INSERT INTO organizations (id, code, name, status, created_by)
              VALUES (?, ?, ?, ?, ?)
            `,
            [
              organizationId,
              input.organizationCode,
              input.organizationName,
              input.status,
              bootstrapAccess.creatorUserId,
            ],
          );
          await connection.execute<ResultSetHeader>(
            `
              INSERT INTO organization_members (organization_id, user_id, status)
              VALUES (?, ?, 'active')
            `,
            [organizationId, bootstrapAccess.creatorUserId],
          );

          /*
           * 核心写入顺序：先创建 Membership，再写 Organization Grant。
           * user_access_grants_membership_fk 会拒绝任何脱离 Membership 的组织授权。
           */
          const grants = [
            ...bootstrapAccess.permissions.map((grantCode) => ({
              grantType: 'permission' as const,
              grantCode,
            })),
            ...bootstrapAccess.skillCodes.map((grantCode) => ({
              grantType: 'skill' as const,
              grantCode,
            })),
          ];
          if (grants.length === 0) {
            throw new AppError({
              statusCode: 500,
              errorCode: 'INTERNAL_ERROR',
              errorMessage: '组织初始化授权不能为空',
            });
          }

          const placeholders = grants
            .map(() => '(?, ?, ?, ?, ?, ?)')
            .join(', ');
          const values = grants.flatMap((grant) => [
            bootstrapAccess.creatorUserId,
            'organization',
            organizationId,
            grant.grantType,
            grant.grantCode,
            bootstrapAccess.creatorUserId,
          ]);
          await connection.execute<ResultSetHeader>(
            `
              INSERT INTO user_access_grants (
                user_id,
                scope_type,
                organization_id,
                grant_type,
                grant_code,
                created_by
              ) VALUES ${placeholders}
            `,
            values,
          );
        }),
      );
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new AppError({
          statusCode: 409,
          errorCode: 'ORGANIZATION_CODE_EXISTS',
          errorMessage: '组织编码已存在',
          details: { field: 'organizationCode' },
          cause: error,
        });
      }
      throw error;
    }

    const organization = await this.findById(organizationId);
    if (!organization) {
      throw new AppError({
        statusCode: 500,
        errorCode: 'INTERNAL_ERROR',
        errorMessage: '组织创建后无法读取',
      });
    }
    return organization;
  }

  async update(
    organizationId: string,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationSummary | null> {
    const assignments: string[] = [];
    const values: Array<string> = [];
    if (input.organizationName !== undefined) {
      assignments.push('name = ?');
      values.push(input.organizationName);
    }
    if (input.status !== undefined) {
      assignments.push('status = ?');
      values.push(input.status);
    }

    await databaseOperation(() =>
      this.pool.execute<ResultSetHeader>(
        `UPDATE organizations SET ${assignments.join(', ')} WHERE id = ?`,
        [...values, organizationId],
      ),
    );
    return this.findById(organizationId);
  }

  async deleteIfUnused(
    organizationId: string,
  ): Promise<DeleteOrganizationResult> {
    return databaseOperation(() =>
      withTransaction(this.pool, async (connection) => {
        const [organizations] = await connection.execute<OrganizationLockRow[]>(
          `
            SELECT
              id AS organizationId,
              created_by AS createdBy
            FROM organizations
            WHERE id = ?
            LIMIT 1
            FOR UPDATE
          `,
          [organizationId],
        );
        if (!organizations[0]) return 'not_found';

        const [members] = await connection.execute<OrganizationMemberRow[]>(
          `
            SELECT user_id AS userId
            FROM organization_members
            WHERE organization_id = ?
          `,
          [organizationId],
        );
        const [grants] = await connection.execute<OrganizationGrantRow[]>(
          `
            SELECT
              user_id AS userId,
              created_by AS createdBy,
              grant_type AS grantType,
              grant_code AS grantCode
            FROM user_access_grants
            WHERE organization_id = ?
          `,
          [organizationId],
        );

        if (members.length > 0 || grants.length > 0) {
          const createdBy = organizations[0].createdBy;
          if (
            !createdBy ||
            !this.hasOnlyBootstrapAccess(createdBy, members, grants)
          ) {
            return 'in_use';
          }

          /*
           * 核心删除顺序：先删除 Organization Grant，再删除 Membership。
           * 两步位于同一事务中，组合外键会阻止任何遗漏 Grant 的成员删除。
           */
          await connection.execute<ResultSetHeader>(
            'DELETE FROM user_access_grants WHERE organization_id = ?',
            [organizationId],
          );
          await connection.execute<ResultSetHeader>(
            'DELETE FROM organization_members WHERE organization_id = ?',
            [organizationId],
          );
        }

        await connection.execute<ResultSetHeader>(
          'DELETE FROM organizations WHERE id = ?',
          [organizationId],
        );
        return 'deleted';
      }),
    );
  }

  private async findById(
    organizationId: string,
  ): Promise<OrganizationSummary | null> {
    const [rows] = await databaseOperation(() =>
      this.pool.execute<OrganizationRow[]>(
        `${organizationSelect} WHERE id = ? LIMIT 1`,
        [organizationId],
      ),
    );
    return rows[0] ?? null;
  }

  private hasOnlyBootstrapAccess(
    createdBy: string,
    members: OrganizationMemberRow[],
    grants: OrganizationGrantRow[],
  ): boolean {
    if (members.length !== 1 || members[0]?.userId !== createdBy) return false;

    const expectedGrantKeys = new Set([
      ...SUPER_ADMIN_ORGANIZATION_PERMISSIONS.map(
        (permission) => `permission:${permission}`,
      ),
      ...SUPER_ADMIN_ORGANIZATION_SKILL_CODES.map(
        (skillCode) => `skill:${skillCode}`,
      ),
    ]);
    if (grants.length !== expectedGrantKeys.size) return false;

    const actualGrantKeys = new Set<string>();
    for (const grant of grants) {
      if (grant.userId !== createdBy || grant.createdBy !== createdBy) {
        return false;
      }
      const grantKey = `${grant.grantType}:${grant.grantCode}`;
      if (!expectedGrantKeys.has(grantKey) || actualGrantKeys.has(grantKey)) {
        return false;
      }
      actualGrantKeys.add(grantKey);
    }
    return actualGrantKeys.size === expectedGrantKeys.size;
  }
}
