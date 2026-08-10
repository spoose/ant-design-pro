import { randomUUID } from 'node:crypto';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { databaseOperation } from '../db/databaseOperation.js';
import { withTransaction } from '../db/transaction.js';
import { AppError } from '../errors/appError.js';

export type UserStatus = 'active' | 'disabled' | 'deleted';

export interface CreateUserInput {
  username: string;
  email: string;
  name: string;
  passwordHash: string;
}

export interface RegisteredUser {
  userId: string;
  username: string;
  email: string;
  name: string;
  status: 'active';
}

export interface AuthenticationUser {
  userId: string;
  username: string;
  email: string;
  name: string;
  avatar: string | null;
  status: UserStatus;
  isSuperAdmin: boolean;
  defaultOrganizationId: string | null;
  tokenVersion: number;
  passwordHash: string;
}

export interface OrganizationAccess {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  permissions: string[];
  skillCodes: string[];
  dataScopes: [];
  defaultDataScopeId: null;
}

export interface AuthCurrentUser {
  userId: string;
  username: string;
  name: string;
  avatar: string | null;
  email: string;
  status: UserStatus;
  isSuperAdmin: boolean;
  platformPermissions: string[];
  platformSkillCodes: string[];
  defaultOrganizationId: string | null;
  organizations: OrganizationAccess[];
}

export type SetDefaultOrganizationResult = 'updated' | 'organization_forbidden';

export type UpdateCurrentUserProfileInput = {
  name?: string;
  avatar?: string | null;
};

export interface UserRepositoryPort {
  createUser(input: CreateUserInput): Promise<RegisteredUser>;
  findAuthenticationUserByAccount(
    account: string,
  ): Promise<AuthenticationUser | null>;
  findAuthenticationUserById(
    userId: string,
  ): Promise<AuthenticationUser | null>;
  getCurrentUser(userId: string): Promise<AuthCurrentUser | null>;
  setDefaultOrganization(
    userId: string,
    organizationId: string,
  ): Promise<SetDefaultOrganizationResult>;
  updateCurrentUserProfile(
    userId: string,
    input: UpdateCurrentUserProfileInput,
  ): Promise<AuthCurrentUser | null>;
}

interface AuthenticationUserRow extends RowDataPacket {
  userId: string;
  username: string;
  email: string;
  name: string;
  avatar: string | null;
  status: UserStatus;
  isSuperAdmin: number;
  defaultOrganizationId: string | null;
  tokenVersion: number;
  passwordHash: string;
}

interface GrantRow extends RowDataPacket {
  grantType: 'permission' | 'skill';
  grantCode: string;
}

interface OrganizationGrantRow extends RowDataPacket {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  grantType: 'permission' | 'skill' | null;
  grantCode: string | null;
}

interface MySqlError extends Error {
  code?: string;
  sqlMessage?: string;
}

function isMySqlError(error: unknown): error is MySqlError {
  return error instanceof Error && 'code' in error;
}

function mapAuthenticationUser(row: AuthenticationUserRow): AuthenticationUser {
  return {
    userId: row.userId,
    username: row.username,
    email: row.email,
    name: row.name,
    avatar: row.avatar,
    status: row.status,
    isSuperAdmin: Boolean(row.isSuperAdmin),
    defaultOrganizationId: row.defaultOrganizationId,
    tokenVersion: row.tokenVersion,
    passwordHash: row.passwordHash,
  };
}

const AUTHENTICATION_USER_SELECT = `
  SELECT
    id AS userId,
    username,
    email,
    display_name AS name,
    avatar_url AS avatar,
    status,
    is_super_admin AS isSuperAdmin,
    default_organization_id AS defaultOrganizationId,
    token_version AS tokenVersion,
    password_hash AS passwordHash
  FROM users
`;

export class UserRepository implements UserRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async createUser(input: CreateUserInput): Promise<RegisteredUser> {
    const userId = randomUUID();
    try {
      await databaseOperation(() =>
        this.pool.execute<ResultSetHeader>(
          `
            INSERT INTO users (id, username, email, display_name, password_hash, status)
            VALUES (?, ?, ?, ?, ?, 'active')
          `,
          [userId, input.username, input.email, input.name, input.passwordHash],
        ),
      );
    } catch (error) {
      if (isMySqlError(error) && error.code === 'ER_DUP_ENTRY') {
        const field = error.sqlMessage?.includes('users_email_unique')
          ? 'email'
          : error.sqlMessage?.includes('users_username_unique')
            ? 'username'
            : undefined;
        if (field) {
          throw new AppError({
            statusCode: 409,
            errorCode: 'ACCOUNT_ALREADY_EXISTS',
            errorMessage: field === 'email' ? '邮箱已存在' : '用户名已存在',
            details: { field },
            cause: error,
          });
        }
      }
      throw error;
    }

    return {
      userId,
      username: input.username,
      email: input.email,
      name: input.name,
      status: 'active',
    };
  }

  async findAuthenticationUserByAccount(
    account: string,
  ): Promise<AuthenticationUser | null> {
    const [rows] = await databaseOperation(() =>
      this.pool.execute<AuthenticationUserRow[]>(
        `${AUTHENTICATION_USER_SELECT} WHERE username = ? OR email = ? LIMIT 1`,
        [account, account],
      ),
    );
    return rows[0] ? mapAuthenticationUser(rows[0]) : null;
  }

  async findAuthenticationUserById(
    userId: string,
  ): Promise<AuthenticationUser | null> {
    const [rows] = await databaseOperation(() =>
      this.pool.execute<AuthenticationUserRow[]>(
        `${AUTHENTICATION_USER_SELECT} WHERE id = ? LIMIT 1`,
        [userId],
      ),
    );
    return rows[0] ? mapAuthenticationUser(rows[0]) : null;
  }

  async getCurrentUser(userId: string): Promise<AuthCurrentUser | null> {
    const user = await this.findAuthenticationUserById(userId);
    if (!user) {
      return null;
    }

    const [[platformGrants], [organizationRows]] = await Promise.all([
      databaseOperation(() =>
        this.pool.execute<GrantRow[]>(
          `
            SELECT grant_type AS grantType, grant_code AS grantCode
            FROM user_access_grants
            WHERE user_id = ? AND scope_type = 'platform' AND organization_id IS NULL
            ORDER BY grant_type, grant_code
          `,
          [userId],
        ),
      ),
      databaseOperation(() =>
        this.pool.execute<OrganizationGrantRow[]>(
          `
            SELECT
              organizations.id AS organizationId,
              organizations.code AS organizationCode,
              organizations.name AS organizationName,
              grants.grant_type AS grantType,
              grants.grant_code AS grantCode
            FROM organization_members AS members
            INNER JOIN organizations
              ON organizations.id = members.organization_id
            LEFT JOIN user_access_grants AS grants
              ON grants.user_id = members.user_id
              AND grants.organization_id = members.organization_id
              AND grants.scope_type = 'organization'
            WHERE members.user_id = ?
              AND members.status = 'active'
              AND organizations.status = 'active'
            ORDER BY organizations.code, organizations.id, grants.grant_type, grants.grant_code
          `,
          [userId],
        ),
      ),
    ]);

    const organizationsById = new Map<string, OrganizationAccess>();
    for (const row of organizationRows) {
      let organization = organizationsById.get(row.organizationId);
      if (!organization) {
        organization = {
          organizationId: row.organizationId,
          organizationCode: row.organizationCode,
          organizationName: row.organizationName,
          permissions: [],
          skillCodes: [],
          dataScopes: [],
          defaultDataScopeId: null,
        };
        organizationsById.set(row.organizationId, organization);
      }
      if (row.grantType === 'permission' && row.grantCode) {
        organization.permissions.push(row.grantCode);
      }
      if (row.grantType === 'skill' && row.grantCode) {
        organization.skillCodes.push(row.grantCode);
      }
    }

    const organizations = [...organizationsById.values()];
    const defaultOrganizationId = organizations.some(
      (organization) =>
        organization.organizationId === user.defaultOrganizationId,
    )
      ? user.defaultOrganizationId
      : null;

    return {
      userId: user.userId,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
      email: user.email,
      status: user.status,
      isSuperAdmin: user.isSuperAdmin,
      platformPermissions: platformGrants
        .filter((grant) => grant.grantType === 'permission')
        .map((grant) => grant.grantCode),
      platformSkillCodes: platformGrants
        .filter((grant) => grant.grantType === 'skill')
        .map((grant) => grant.grantCode),
      defaultOrganizationId,
      organizations,
    };
  }

  async setDefaultOrganization(
    userId: string,
    organizationId: string,
  ): Promise<SetDefaultOrganizationResult> {
    return databaseOperation(() =>
      withTransaction(this.pool, async (connection) => {
        /*
         * 该访问条件必须与 getCurrentUser.organizations 保持一致。
         * FOR UPDATE 同时锁定 User、Membership 和 Organization，避免校验后状态变化，
         * 导致用户保存一个已经无法进入的默认 Organization。
         */
        const [accessRows] = await connection.execute<RowDataPacket[]>(
          `
            SELECT users.id AS userId
            FROM users
            INNER JOIN organization_members AS members
              ON members.user_id = users.id
              AND members.organization_id = ?
              AND members.status = 'active'
            INNER JOIN organizations
              ON organizations.id = members.organization_id
              AND organizations.status = 'active'
            WHERE users.id = ?
              AND users.status = 'active'
            LIMIT 1
            FOR UPDATE
          `,
          [organizationId, userId],
        );

        if (!accessRows[0]) {
          return 'organization_forbidden';
        }

        // 只更新登录偏好；权限、Membership 和 tokenVersion 均不在此链路修改。
        await connection.execute<ResultSetHeader>(
          `
            UPDATE users
            SET default_organization_id = ?
            WHERE id = ?
          `,
          [organizationId, userId],
        );
        return 'updated';
      }),
    );
  }

  async updateCurrentUserProfile(
    userId: string,
    input: UpdateCurrentUserProfileInput,
  ): Promise<AuthCurrentUser | null> {
    const assignments: string[] = [];
    const params: Array<string | null> = [];

    if (input.name !== undefined) {
      assignments.push('display_name = ?');
      params.push(input.name);
    }
    if (input.avatar !== undefined) {
      assignments.push('avatar_url = ?');
      params.push(input.avatar);
    }

    if (assignments.length > 0) {
      const [result] = await databaseOperation(() =>
        this.pool.execute<ResultSetHeader>(
          `
            UPDATE users
            SET ${assignments.join(', ')}
            WHERE id = ?
              AND status = 'active'
          `,
          [...params, userId],
        ),
      );

      if (result.affectedRows === 0) {
        return this.getCurrentUser(userId);
      }
    }

    return this.getCurrentUser(userId);
  }
}
