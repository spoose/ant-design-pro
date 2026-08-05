import {
  SUPER_ADMIN_PLATFORM_PERMISSIONS,
  SUPER_ADMIN_PLATFORM_SKILL_CODES,
} from '../permissions/catalog.js';
import type {
  SeededSuperAdmin,
  SuperAdminSeedRepositoryPort,
} from '../repositories/superAdminSeedRepository.js';
import type { RegisterRequest } from '../schemas/auth.js';
import { PasswordService } from './passwordService.js';

export class SuperAdminSeedService {
  constructor(
    private readonly repository: SuperAdminSeedRepositoryPort,
    private readonly passwords: PasswordService,
  ) {}

  async seed(input: RegisterRequest): Promise<SeededSuperAdmin> {
    const passwordHash = await this.passwords.hash(input.password);
    return this.repository.createInitialSuperAdmin({
      username: input.username,
      email: input.email,
      name: input.name,
      passwordHash,
      platformPermissions: SUPER_ADMIN_PLATFORM_PERMISSIONS,
      platformSkillCodes: SUPER_ADMIN_PLATFORM_SKILL_CODES,
    });
  }
}
