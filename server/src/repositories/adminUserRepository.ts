import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { databaseOperation } from '../db/databaseOperation.js';
import { withTransaction } from '../db/transaction.js';
import { AppError } from '../errors/appError.js';
import type { UserStatus } from './userRepository.js';

export type AdminUserOrganization = {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
};

export type AdminUser = {
  userId: string;
  username: string;
  email: string;
  name: string;
  avatar: string | null;
  status: UserStatus;
  isSuperAdmin: boolean;
  defaultOrganizationId: string | null;
  organizations: AdminUserOrganization[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type AdminUserListInput = {
  page: number;
  pageSize: number;
  keyword?: string | undefined;
  status?: UserStatus | undefined;
  sortBy: 'username' | 'email' | 'name' | 'status' | 'createdAt';
  sortOrder: 'asc' | 'desc';
};

export type AdminUserPage = {
  list: AdminUser[];
  page: number;
  pageSize: number;
  total: number;
};

export interface AdminUserRepositoryPort {
  list(input: AdminUserListInput): Promise<AdminUserPage>;
  setOrganizations(
    userId: string,
    organizationIds: string[],
  ): Promise<
    AdminUserOrganization[] | 'user_not_found' | 'organization_not_found'
  >;
  setStatus(
    actorUserId: string,
    userId: string,
    status: 'active' | 'disabled',
  ): Promise<
    | { userId: string; status: 'active' | 'disabled' }
    | 'user_not_found'
    | 'self_disable'
    | 'last_super_admin'
  >;
}

interface AdminUserRow extends RowDataPacket {
  userId: string;
  username: string;
  email: string;
  name: string;
  avatar: string | null;
  status: UserStatus;
  isSuperAdmin: number;
  defaultOrganizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface UserCountRow extends RowDataPacket {
  total: number;
}

interface AdminUserOrganizationRow extends RowDataPacket {
  userId: string;
  organizationId: string;
  organizationCode: string;
  organizationName: string;
}

interface AdminUserStatusRow extends RowDataPacket {
  userId: string;
  status: UserStatus;
  isSuperAdmin: number;
}

const sortColumns: Record<AdminUserListInput['sortBy'], string> = {
  username: 'username',
  email: 'email',
  name: 'display_name',
  status: 'status',
  createdAt: 'created_at',
};

export class AdminUserRepository implements AdminUserRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async list(input: AdminUserListInput): Promise<AdminUserPage> {
    const conditions: string[] = [];
    const values: string[] = [];
    if (input.keyword) {
      conditions.push(
        '(username LIKE ? OR email LIKE ? OR display_name LIKE ?)',
      );
      const pattern = `%${input.keyword}%`;
      values.push(pattern, pattern, pattern);
    }
    if (input.status) {
      conditions.push('status = ?');
      values.push(input.status);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';
    const orderBy = sortColumns[input.sortBy];
    const sortOrder = input.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const offset = (input.page - 1) * input.pageSize;

    const [[users], [countRows]] = await Promise.all([
      databaseOperation(() =>
        this.pool.execute<AdminUserRow[]>(
          `
            SELECT
              id AS userId,
              username,
              email,
              display_name AS name,
              avatar_url AS avatar,
              status,
              is_super_admin AS isSuperAdmin,
              default_organization_id AS defaultOrganizationId,
              created_at AS createdAt,
              updated_at AS updatedAt,
              deleted_at AS deletedAt
            FROM users
            ${whereClause}
            ORDER BY ${orderBy} ${sortOrder}, id ASC
            LIMIT ${input.pageSize} OFFSET ${offset}
          `,
          values,
        ),
      ),
      databaseOperation(() =>
        this.pool.execute<UserCountRow[]>(
          `SELECT COUNT(*) AS total FROM users ${whereClause}`,
          values,
        ),
      ),
    ]);

    const countRow = countRows[0];
    if (!countRow) {
      throw new AppError({
        statusCode: 500,
        errorCode: 'INTERNAL_ERROR',
        errorMessage: '用户总数查询未返回结果',
      });
    }

    const organizationsByUserId = new Map<string, AdminUserOrganization[]>();
    if (users.length > 0) {
      const placeholders = users.map(() => '?').join(', ');
      const [organizations] = await databaseOperation(() =>
        this.pool.execute<AdminUserOrganizationRow[]>(
          `
            SELECT
              members.user_id AS userId,
              organizations.id AS organizationId,
              organizations.code AS organizationCode,
              organizations.name AS organizationName
            FROM organization_members AS members
            INNER JOIN organizations
              ON organizations.id = members.organization_id
            WHERE members.user_id IN (${placeholders})
              AND members.status = 'active'
              AND organizations.status = 'active'
            ORDER BY organizations.code, organizations.id
          `,
          users.map((user) => user.userId),
        ),
      );
      for (const organization of organizations) {
        const userOrganizations =
          organizationsByUserId.get(organization.userId) ?? [];
        userOrganizations.push({
          organizationId: organization.organizationId,
          organizationCode: organization.organizationCode,
          organizationName: organization.organizationName,
        });
        organizationsByUserId.set(organization.userId, userOrganizations);
      }
    }

    return {
      list: users.map((user) => ({
        ...user,
        isSuperAdmin: Boolean(user.isSuperAdmin),
        organizations: organizationsByUserId.get(user.userId) ?? [],
      })),
      page: input.page,
      pageSize: input.pageSize,
      total: Number(countRow.total),
    };
  }

  async setOrganizations(
    userId: string,
    organizationIds: string[],
  ): Promise<
    AdminUserOrganization[] | 'user_not_found' | 'organization_not_found'
  > {
    return databaseOperation(() =>
      withTransaction(this.pool, async (connection) => {
        const [users] = await connection.execute<RowDataPacket[]>(
          "SELECT id FROM users WHERE id = ? AND status != 'deleted' FOR UPDATE",
          [userId],
        );
        if (!users[0]) return 'user_not_found';

        const placeholders = organizationIds.map(() => '?').join(', ');
        const [organizations] = await connection.execute<
          AdminUserOrganizationRow[]
        >(
          `
              SELECT
                id AS organizationId,
                code AS organizationCode,
                name AS organizationName
              FROM organizations
              WHERE id IN (${placeholders}) AND status = 'active'
              ORDER BY code, id
              FOR UPDATE
            `,
          organizationIds,
        );
        if (organizations.length !== organizationIds.length) {
          return 'organization_not_found';
        }

        await connection.execute<ResultSetHeader>(
          `
            DELETE FROM user_access_grants
            WHERE user_id = ?
              AND scope_type = 'organization'
              AND organization_id NOT IN (${placeholders})
          `,
          [userId, ...organizationIds],
        );
        await connection.execute<ResultSetHeader>(
          `
            DELETE FROM organization_members
            WHERE user_id = ? AND organization_id NOT IN (${placeholders})
          `,
          [userId, ...organizationIds],
        );

        const membershipValues = organizationIds.flatMap((organizationId) => [
          organizationId,
          userId,
        ]);
        await connection.execute<ResultSetHeader>(
          `
            INSERT INTO organization_members (organization_id, user_id, status)
            VALUES ${organizationIds.map(() => "(?, ?, 'active')").join(', ')}
            ON DUPLICATE KEY UPDATE status = 'active'
          `,
          membershipValues,
        );
        await connection.execute<ResultSetHeader>(
          `
            UPDATE users
            SET
              default_organization_id = IF(
                default_organization_id IN (${placeholders}),
                default_organization_id,
                NULL
              ),
              token_version = token_version + 1
            WHERE id = ?
          `,
          [...organizationIds, userId],
        );

        return organizations.map(
          ({ organizationId, organizationCode, organizationName }) => ({
            organizationId,
            organizationCode,
            organizationName,
          }),
        );
      }),
    );
  }

  async setStatus(
    actorUserId: string,
    userId: string,
    status: 'active' | 'disabled',
  ): Promise<
    | { userId: string; status: 'active' | 'disabled' }
    | 'user_not_found'
    | 'self_disable'
    | 'last_super_admin'
  > {
    return databaseOperation(() =>
      withTransaction(this.pool, async (connection) => {
        const [users] = await connection.execute<AdminUserStatusRow[]>(
          `
            SELECT
              id AS userId,
              status,
              is_super_admin AS isSuperAdmin
            FROM users
            WHERE id = ? AND status != 'deleted'
            FOR UPDATE
          `,
          [userId],
        );
        const user = users[0];
        if (!user) return 'user_not_found';
        if (status === 'disabled' && userId === actorUserId) {
          return 'self_disable';
        }
        if (user.status === status) return { userId, status };

        if (status === 'disabled' && user.isSuperAdmin) {
          const [activeSuperAdmins] = await connection.execute<RowDataPacket[]>(
            `
              SELECT id
              FROM users
              WHERE is_super_admin = TRUE AND status = 'active'
              FOR UPDATE
            `,
          );
          if (activeSuperAdmins.length <= 1) return 'last_super_admin';
        }

        await connection.execute<ResultSetHeader>(
          `
            UPDATE users
            SET status = ?, token_version = token_version + 1
            WHERE id = ?
          `,
          [status, userId],
        );
        return { userId, status };
      }),
    );
  }
}
