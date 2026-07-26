import type {
  AdminUserListInput,
  AdminUserPage,
  AdminUserRepositoryPort,
} from '../repositories/adminUserRepository.js';

export interface AdminUserServicePort {
  list(input: AdminUserListInput): Promise<AdminUserPage>;
}

export class AdminUserService implements AdminUserServicePort {
  constructor(private readonly users: AdminUserRepositoryPort) {}

  list(input: AdminUserListInput): Promise<AdminUserPage> {
    return this.users.list(input);
  }
}
