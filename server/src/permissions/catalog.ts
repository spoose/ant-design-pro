export const SUPER_ADMIN_PLATFORM_PERMISSIONS = [
  'platform:organization:create',
  'platform:organization:update',
  'platform:organization:delete',
  'platform:user:manage',
  'platform:permission:grant',
  'platform:audit:view',
] as const;

/** Platform Scope 内已注册的全部 Skill。 */
export const PLATFORM_SKILL_CODES = [
  'ai-assistant',
  'file-review',
  'document-summary',
  'knowledge-search',
] as const;

/** Organization Scope 内已注册的全部 Skill。 */
export const ORGANIZATION_SKILL_CODES = [
  'ai-assistant',
  'file-review',
  'document-summary',
  'knowledge-search',
] as const;

export const SUPER_ADMIN_PLATFORM_SKILL_CODES = PLATFORM_SKILL_CODES;

export const SUPER_ADMIN_ORGANIZATION_PERMISSIONS = ['organization:*'] as const;

export const SUPER_ADMIN_ORGANIZATION_SKILL_CODES = ORGANIZATION_SKILL_CODES;
