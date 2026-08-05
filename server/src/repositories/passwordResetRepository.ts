import { randomUUID } from 'node:crypto';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { databaseOperation } from '../db/databaseOperation.js';
import { withTransaction } from '../db/transaction.js';

export interface PasswordResetUser {
  userId: string;
  email: string;
}

export interface PasswordResetRepositoryPort {
  findActiveUserByEmail(email: string): Promise<PasswordResetUser | null>;
  replaceToken(
    userId: string,
    tokenHash: Buffer,
    expiresAt: Date,
  ): Promise<void>;
  consumeToken(
    tokenHash: Buffer,
    passwordHash: string,
    consumedAt: Date,
  ): Promise<boolean>;
}

interface PasswordResetUserRow extends RowDataPacket {
  userId: string;
  email: string;
}

interface PasswordResetTokenRow extends RowDataPacket {
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export class PasswordResetRepository implements PasswordResetRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async findActiveUserByEmail(
    email: string,
  ): Promise<PasswordResetUser | null> {
    const [rows] = await databaseOperation(() =>
      this.pool.execute<PasswordResetUserRow[]>(
        `
          SELECT id AS userId, email
          FROM users
          WHERE email = ? AND status = 'active'
          LIMIT 1
        `,
        [email],
      ),
    );
    return rows[0] ?? null;
  }

  async replaceToken(
    userId: string,
    tokenHash: Buffer,
    expiresAt: Date,
  ): Promise<void> {
    await databaseOperation(() =>
      withTransaction(this.pool, async (connection) => {
        await connection.execute(
          `
            UPDATE password_reset_tokens
            SET used_at = CURRENT_TIMESTAMP(3)
            WHERE user_id = ? AND used_at IS NULL
          `,
          [userId],
        );
        await connection.execute(
          `
            INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
            VALUES (?, ?, ?, ?)
          `,
          [randomUUID(), userId, tokenHash, expiresAt],
        );
      }),
    );
  }

  async consumeToken(
    tokenHash: Buffer,
    passwordHash: string,
    consumedAt: Date,
  ): Promise<boolean> {
    return databaseOperation(() =>
      withTransaction(this.pool, async (connection) => {
        const [rows] = await connection.execute<PasswordResetTokenRow[]>(
          `
            SELECT user_id AS userId, expires_at AS expiresAt, used_at AS usedAt
            FROM password_reset_tokens
            WHERE token_hash = ?
            LIMIT 1
            FOR UPDATE
          `,
          [tokenHash],
        );
        const token = rows[0];
        if (
          !token ||
          token.usedAt ||
          token.expiresAt.getTime() <= consumedAt.getTime()
        ) {
          return false;
        }

        const [updatedUser] = await connection.execute<ResultSetHeader>(
          `
            UPDATE users
            SET password_hash = ?, token_version = token_version + 1
            WHERE id = ? AND status = 'active'
          `,
          [passwordHash, token.userId],
        );
        if (updatedUser.affectedRows !== 1) {
          return false;
        }

        await connection.execute(
          `
            UPDATE password_reset_tokens
            SET used_at = ?
            WHERE user_id = ? AND used_at IS NULL
          `,
          [consumedAt, token.userId],
        );
        return true;
      }),
    );
  }
}
