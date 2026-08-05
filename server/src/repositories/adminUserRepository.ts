import type { Pool, RowDataPacket } from 'mysql2/promise';
import { databaseOperation } from '../db/databaseOperation.js';
import { AppError } from '../errors/appError.js';
import type { UserStatus } from './userRepository.js';

export type AdminUser = {
  userId: string;
  username: string;
  email: string;
  name: string;
  avatar: string | null;
  status: UserStatus;
  isSuperAdmin: boolean;
  defaultOrganizationId: string | null;
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

    return {
      list: users.map((user) => ({
        ...user,
        isSuperAdmin: Boolean(user.isSuperAdmin),
      })),
      page: input.page,
      pageSize: input.pageSize,
      total: Number(countRow.total),
    };
  }
}
