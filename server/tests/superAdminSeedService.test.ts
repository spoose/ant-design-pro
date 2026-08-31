import { describe, expect, it } from 'vitest';
import type {
  CreateInitialSuperAdminInput,
  SuperAdminSeedRepositoryPort,
} from '../src/repositories/superAdminSeedRepository.js';
import { PasswordService } from '../src/services/passwordService.js';
import { SuperAdminSeedService } from '../src/services/superAdminSeedService.js';

describe('SuperAdminSeedService', () => {
  it('hashes the password and passes the controlled access catalog to the repository', async () => {
    let capturedInput: CreateInitialSuperAdminInput | undefined;
    const repository: SuperAdminSeedRepositoryPort = {
      createInitialSuperAdmin: async (input) => {
        capturedInput = input;
        return {
          userId: 'super-admin-1',
          username: input.username,
          email: input.email,
          name: input.name,
          status: 'active',
          isSuperAdmin: true,
          platformPermissions: input.platformPermissions,
          projectAppCodes: input.projectAppCodes,
        };
      },
    };
    const passwords = new PasswordService();
    const service = new SuperAdminSeedService(repository, passwords);
    const plainPassword = 'correct horse battery staple';

    const result = await service.seed({
      username: 'root.admin',
      email: 'root.admin@example.com',
      name: 'Root Admin',
      password: plainPassword,
    });

    expect(result).toMatchObject({
      userId: 'super-admin-1',
      isSuperAdmin: true,
      status: 'active',
    });
    expect(capturedInput?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(capturedInput?.passwordHash).not.toBe(plainPassword);
    expect(capturedInput?.platformPermissions).toContain(
      'platform:user:manage',
    );
    expect(capturedInput?.projectAppCodes).toEqual([
      'ai-assistant',
      'file-review',
      'document-summary',
      'knowledge-search',
    ]);
  });
});
