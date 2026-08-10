import { AppError } from '../errors/appError.js';
import type {
  AdminUserOrganization,
  AdminUserListInput,
  AdminUserPage,
  AdminUserRepositoryPort,
} from '../repositories/adminUserRepository.js';

export interface AdminUserServicePort {
  list(input: AdminUserListInput): Promise<AdminUserPage>;
  setOrganizations(
    userId: string,
    organizationIds: string[],
  ): Promise<{ organizations: AdminUserOrganization[] }>;
  setStatus(
    actorUserId: string,
    userId: string,
    status: 'active' | 'disabled',
  ): Promise<{ userId: string; status: 'active' | 'disabled' }>;
}

export class AdminUserService implements AdminUserServicePort {
  constructor(private readonly users: AdminUserRepositoryPort) {}

  list(input: AdminUserListInput): Promise<AdminUserPage> {
    return this.users.list(input);
  }

  async setOrganizations(
    userId: string,
    organizationIds: string[],
  ): Promise<{ organizations: AdminUserOrganization[] }> {
    const result = await this.users.setOrganizations(userId, organizationIds);
    if (result === 'user_not_found') {
      throw new AppError({
        statusCode: 404,
        errorCode: 'USER_NOT_FOUND',
        errorMessage: '用户不存在',
      });
    }
    if (result === 'organization_not_found') {
      throw new AppError({
        statusCode: 400,
        errorCode: 'ORGANIZATION_INVALID',
        errorMessage: '组织不存在或未启用',
      });
    }
    return { organizations: result };
  }

  async setStatus(
    actorUserId: string,
    userId: string,
    status: 'active' | 'disabled',
  ): Promise<{ userId: string; status: 'active' | 'disabled' }> {
    const result = await this.users.setStatus(actorUserId, userId, status);
    if (result === 'user_not_found') {
      throw new AppError({
        statusCode: 404,
        errorCode: 'USER_NOT_FOUND',
        errorMessage: '用户不存在',
      });
    }
    if (result === 'self_disable') {
      throw new AppError({
        statusCode: 409,
        errorCode: 'CANNOT_DISABLE_SELF',
        errorMessage: '不能停用当前登录用户',
      });
    }
    if (result === 'last_super_admin') {
      throw new AppError({
        statusCode: 409,
        errorCode: 'LAST_SUPER_ADMIN_REQUIRED',
        errorMessage: '不能停用最后一个有效 Super Admin',
      });
    }
    return result;
  }
}
