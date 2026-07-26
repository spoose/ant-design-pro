import { AppError } from '../errors/appError.js';
import type {
  AuthCurrentUser,
  UserRepositoryPort,
} from '../repositories/userRepository.js';

export interface CurrentUserServicePort {
  getCurrentUser(userId: string): Promise<AuthCurrentUser>;
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
}
