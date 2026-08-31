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
  'drone-operations',
  'file-review',
  'document-summary',
  'knowledge-search',
] as const;

/** Organization Scope 内已注册的全部应用。 */
export const ORGANIZATION_APP_CODES = [
  'ai-assistant',
  'drone-operations',
  'file-review',
  'document-summary',
  'knowledge-search',
] as const;

export const SUPER_ADMIN_PROJECT_APP_CODES = PROJECT_APP_CODES;

export const SUPER_ADMIN_ORGANIZATION_PERMISSIONS = ['organization:*'] as const;

/** 新建组织沿用原基础应用；政务低空必须通过单独的数据库授权获得。 */
export const SUPER_ADMIN_ORGANIZATION_APP_CODES = [
  'ai-assistant',
  'file-review',
  'document-summary',
  'knowledge-search',
] as const;
