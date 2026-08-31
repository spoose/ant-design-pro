import { randomUUID } from 'node:crypto';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { AppError } from '../errors/appError.js';

export interface CreateInitialSuperAdminInput {
  username: string;
  email: string;
  name: string;
  passwordHash: string;
  platformPermissions: readonly string[];
  projectAppCodes: readonly string[];
}

export interface SeededSuperAdmin {
  userId: string;
  username: string;
  email: string;
  name: string;
  status: 'active';
  isSuperAdmin: true;
  platformPermissions: readonly string[];
  projectAppCodes: readonly string[];
}

export interface SuperAdminSeedRepositoryPort {
  createInitialSuperAdmin(
    input: CreateInitialSuperAdminInput,
  ): Promise<SeededSuperAdmin>;
}

interface LockRow extends RowDataPacket {
  acquired: number | null;
}

interface ExistingSuperAdminRow extends RowDataPacket {
  userId: string;
}

interface AccountConflictRow extends RowDataPacket {
  username: string;
  email: string;
}

const SEED_LOCK_NAME = 'ant_design_pro:super_admin_seed';

export class SuperAdminSeedRepository implements SuperAdminSeedRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async createInitialSuperAdmin(
    input: CreateInitialSuperAdminInput,
  ): Promise<SeededSuperAdmin> {
    const connection = await this.pool.getConnection();
    let lockAcquired = false;
    let transactionStarted = false;

    try {
      const [lockRows] = await connection.execute<LockRow[]>(
        'SELECT GET_LOCK(?, 10) AS acquired',
        [SEED_LOCK_NAME],
      );
      if (lockRows[0]?.acquired !== 1) {
        throw new AppError({
          statusCode: 409,
          errorCode: 'SUPER_ADMIN_SEED_BUSY',
          errorMessage: '另一个 Super Admin Seed 正在执行',
        });
      }
      lockAcquired = true;

      await connection.beginTransaction();
      transactionStarted = true;

      const [existingSuperAdmins] = await connection.execute<
        ExistingSuperAdminRow[]
      >(
        `
          SELECT id AS userId
          FROM users
          WHERE is_super_admin = TRUE
          LIMIT 1
          FOR UPDATE
        `,
      );
      if (existingSuperAdmins.length > 0) {
        throw new AppError({
          statusCode: 409,
          errorCode: 'SUPER_ADMIN_ALREADY_EXISTS',
          errorMessage: 'Super Admin 已存在，Seed 已拒绝',
        });
      }

      const [accountConflicts] = await connection.execute<AccountConflictRow[]>(
        `
          SELECT username, email
          FROM users
          WHERE username = ? OR email = ?
          LIMIT 1
          FOR UPDATE
        `,
        [input.username, input.email],
      );
      const accountConflict = accountConflicts[0];
      if (accountConflict) {
        const field =
          accountConflict.email === input.email ? 'email' : 'username';
        throw new AppError({
          statusCode: 409,
          errorCode: 'ACCOUNT_ALREADY_EXISTS',
          errorMessage: field === 'email' ? '邮箱已存在' : '用户名已存在',
          details: { field },
        });
      }

      const userId = randomUUID();
      await connection.execute<ResultSetHeader>(
        `
          INSERT INTO users (
            id,
            username,
            email,
            display_name,
            password_hash,
            status,
            is_super_admin
          ) VALUES (?, ?, ?, ?, ?, 'active', TRUE)
        `,
        [userId, input.username, input.email, input.name, input.passwordHash],
      );

      const grants = [
        ...input.platformPermissions.map((grantCode) => ({
          grantType: 'permission',
          grantCode,
        })),
        ...input.projectAppCodes.map((grantCode) => ({
          grantType: 'app',
          grantCode,
        })),
      ];
      const placeholders = grants
        .map(() => "(?, 'platform', NULL, ?, ?, ?)")
        .join(', ');
      const values = grants.flatMap((grant) => [
        userId,
        grant.grantType,
        grant.grantCode,
        userId,
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

      await connection.commit();
      transactionStarted = false;

      return {
        userId,
        username: input.username,
        email: input.email,
        name: input.name,
        status: 'active',
        isSuperAdmin: true,
        platformPermissions: input.platformPermissions,
        projectAppCodes: input.projectAppCodes,
      };
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback();
      }
      throw error;
    } finally {
      try {
        if (lockAcquired) {
          await connection.execute('SELECT RELEASE_LOCK(?)', [SEED_LOCK_NAME]);
        }
      } finally {
        connection.release();
      }
    }
  }
}
