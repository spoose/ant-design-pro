import type { AuthBackendKind } from '@/services/auth-backends';

const AUTH_SESSION_METADATA_STORAGE_KEY =
  'ant-design-pro.auth-session-metadata';

/**
 * 允许跨刷新恢复的最小登录上下文。只保存非敏感字段；
 * password、credential、Token 和完整用户响应都不属于该对象。
 */
export type AuthSessionMetadata = {
  backend: AuthBackendKind;
  /** 登录时已经由 Token 或 Legacy currentUser 验证的稳定用户 ID。 */
  userId?: string;
  projectId?: string;
  /** XOne 登录 identifier；Legacy 中等同于 username。 */
  identifier?: string;
  activeOrganizationId?: string;
  /** XOne 登录后获得的真实组织列表，用于组织 Token 整页刷新后恢复页面会话。 */
  organizations?: Array<{
    organizationId: string;
    organizationCode: string;
    organizationName: string;
    defaultFlag: boolean;
  }>;
};

const isOptionalString = (value: unknown) =>
  value === undefined || typeof value === 'string';

const isOrganization = (value: unknown) => {
  if (!value || typeof value !== 'object') return false;
  const organization = value as Record<string, unknown>;
  return (
    typeof organization.organizationId === 'string' &&
    typeof organization.organizationCode === 'string' &&
    typeof organization.organizationName === 'string' &&
    typeof organization.defaultFlag === 'boolean'
  );
};

/** localStorage 内容不可信，读取时只接受完整满足字段约束的最小对象。 */
const isAuthSessionMetadata = (
  value: unknown,
): value is AuthSessionMetadata => {
  if (!value || typeof value !== 'object') return false;
  const metadata = value as Record<string, unknown>;
  return (
    (metadata.backend === 'legacy' || metadata.backend === 'xone') &&
    isOptionalString(metadata.userId) &&
    isOptionalString(metadata.projectId) &&
    isOptionalString(metadata.identifier) &&
    isOptionalString(metadata.activeOrganizationId) &&
    (metadata.organizations === undefined ||
      (Array.isArray(metadata.organizations) &&
        metadata.organizations.every(isOrganization)))
  );
};

export const saveAuthSessionMetadata = (metadata: AuthSessionMetadata) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    AUTH_SESSION_METADATA_STORAGE_KEY,
    JSON.stringify(metadata),
  );
};

export const getAuthSessionMetadata = () => {
  if (typeof window === 'undefined') return undefined;
  const serialized = window.localStorage.getItem(
    AUTH_SESSION_METADATA_STORAGE_KEY,
  );
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    return isAuthSessionMetadata(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export const clearAuthSessionMetadata = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_SESSION_METADATA_STORAGE_KEY);
};
