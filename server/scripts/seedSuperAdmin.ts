import 'dotenv/config';
import { loadDatabaseEnv } from '../src/config/env.js';
import { createDatabasePool } from '../src/db/pool.js';
import { AppError } from '../src/errors/appError.js';
import { SuperAdminSeedRepository } from '../src/repositories/superAdminSeedRepository.js';
import { registerSchema } from '../src/schemas/auth.js';
import { PasswordService } from '../src/services/passwordService.js';
import { SuperAdminSeedService } from '../src/services/superAdminSeedService.js';

function requireSeedValue(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少必需环境变量：${name}`);
  }
  return value;
}

async function seedSuperAdmin(): Promise<void> {
  const parsedInput = registerSchema.safeParse({
    username: requireSeedValue('SUPER_ADMIN_USERNAME'),
    email: requireSeedValue('SUPER_ADMIN_EMAIL'),
    name: requireSeedValue('SUPER_ADMIN_NAME'),
    password: requireSeedValue('SUPER_ADMIN_PASSWORD'),
  });
  if (!parsedInput.success) {
    const details = parsedInput.error.issues
      .map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Super Admin Seed 配置无效：${details}`);
  }

  const pool = createDatabasePool(loadDatabaseEnv());
  try {
    await pool.query('SELECT 1 AS ok');
    const repository = new SuperAdminSeedRepository(pool);
    const service = new SuperAdminSeedService(
      repository,
      new PasswordService(),
    );
    const result = await service.seed(parsedInput.data);
    console.info('Super Admin Seed completed', result);
  } finally {
    await pool.end();
  }
}

seedSuperAdmin().catch((error: unknown) => {
  if (error instanceof AppError) {
    console.error('Super Admin Seed failed', {
      errorCode: error.errorCode,
      errorMessage: error.message,
    });
  } else {
    console.error(
      'Super Admin Seed failed',
      error instanceof Error ? error.message : '未知错误',
    );
  }
  process.exitCode = 1;
});
