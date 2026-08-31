export const SUPER_ADMIN_PLATFORM_PERMISSIONS = [
  'platform:organization:create',
  'platform:organization:update',
  'platform:organization:delete',
  'platform:user:manage',
  'platform:permission:grant',
  'platform:audit:view',
] as const;

/** Project Scope 内已注册的全部应用。 */
export const PROJECT_APP_CODES = [
  'ai-assistant',
  'file-review',
  'document-summary',
  'knowledge-search',
] as const;

/** Organization Scope 内已注册的全部应用。 */
export const ORGANIZATION_APP_CODES = [
  'ai-assistant',
  'file-review',
  'document-summary',
  'knowledge-search',
] as const;

export const SUPER_ADMIN_PROJECT_APP_CODES = PROJECT_APP_CODES;

export const SUPER_ADMIN_ORGANIZATION_PERMISSIONS = ['organization:*'] as const;

export const SUPER_ADMIN_ORGANIZATION_APP_CODES = ORGANIZATION_APP_CODES;
