import { AppError } from '../errors/appError.js';
import type {
  AuthCurrentUser,
  UpdateCurrentUserProfileInput,
  UserRepositoryPort,
} from '../repositories/userRepository.js';

export interface CurrentUserServicePort {
  getCurrentUser(userId: string): Promise<AuthCurrentUser>;
  setDefaultOrganization(
    userId: string,
    organizationId: string,
  ): Promise<{ defaultOrganizationId: string }>;
  updateCurrentUserProfile(
    userId: string,
    input: UpdateCurrentUserProfileInput,
  ): Promise<AuthCurrentUser>;
}

export class CurrentUserService implements CurrentUserServicePort {
  constructor(private readonly users: UserRepositoryPort) {}

  async getCurrentUser(userId: string): Promise<AuthCurrentUser> {
    const user = await this.users.getCurrentUser(userId);
    if (!user || user.status !== 'active') {
      throw new AppError({
        statusCode: 401,
        errorCode: 'ACCESS_TOKEN_INVALID',
        errorMessage: 'Access Token 无效',
      });
    }
    return user;
  }

  async setDefaultOrganization(
    userId: string,
    organizationId: string,
  ): Promise<{ defaultOrganizationId: string }> {
    const result = await this.users.setDefaultOrganization(
      userId,
      organizationId,
    );
    if (result === 'organization_forbidden') {
      /*
       * 不区分 Organization 不存在、已停用或用户无 Membership，
       * 避免向无权限用户泄露组织目录。
       */
      throw new AppError({
        statusCode: 403,
        errorCode: 'ORGANIZATION_FORBIDDEN',
        errorMessage: '当前用户不能进入指定组织',
      });
    }
    return { defaultOrganizationId: organizationId };
  }

  async updateCurrentUserProfile(
    userId: string,
    input: UpdateCurrentUserProfileInput,
  ): Promise<AuthCurrentUser> {
    const user = await this.users.updateCurrentUserProfile(userId, input);
    if (!user || user.status !== 'active') {
      throw new AppError({
        statusCode: 401,
        errorCode: 'ACCESS_TOKEN_INVALID',
        errorMessage: 'Access Token 无效',
      });
    }
    return user;
  }
}
