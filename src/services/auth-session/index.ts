import {
  type AuthBackend,
  type AuthBackendLoginInput,
  type AuthBackendRequestOptions,
  resolveAuthBackend,
} from '../auth-backends';
import type { AuthSession } from '../auth-model';
import {
  clearAuthSessionMetadata,
  getAuthSessionMetadata,
  saveAuthSessionMetadata,
} from '@/utils/authSessionMetadata';
import type { AuthSessionMetadata } from '@/utils/authSessionMetadata';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '@/utils/authToken';
import { normalizeAuthCurrentUser } from './normalize';
import {
  decodeXoneTokenClaims,
  assertXoneLoginToken,
  assertXoneOrganizationSwitchToken,
  XoneTokenClaimsError,
} from './xoneTokenClaims';

export { normalizeAuthCurrentUser } from './normalize';

/** 构建配置与本地会话来自不同后端时，必须重新登录，禁止混用 Token。 */
export class AuthBackendMismatchError extends Error {
  constructor() {
    super('认证后端已切换，请重新登录');
    this.name = 'AuthBackendMismatchError';
  }
}

/** 从标准用户和最小元数据生成页面会话，不额外复制完整后端响应。 */
const createAuthSession = (
  backend: AuthBackend,
  currentUser: AuthSession['currentUser'],
  activeOrganizationId?: string,
): AuthSession => ({
  backend: backend.kind,
  projectId: currentUser.projectId,
  activeOrganizationId,
  currentUser,
});

/** 只持久化刷新会话所需的真实组织字段，不保存权限派生结果或完整用户对象。 */
const toStoredOrganizations = (
  currentUser: AuthSession['currentUser'],
) =>
  currentUser.organizations.map((organization) => ({
    organizationId: organization.organizationId,
    organizationCode: organization.organizationCode,
    organizationName: organization.organizationName,
    defaultFlag:
      organization.organizationId === currentUser.defaultOrganizationId,
  }));

/** 将登录时保存的真实组织列表恢复为 XOne 归一化层需要的原始快照。 */
const createStoredXoneSnapshot = (
  organizations: NonNullable<AuthSessionMetadata['organizations']>,
) => ({
  source: 'xone' as const,
  organizations: organizations.map(
    ({ organizationId, ...organization }) => ({
      id: organizationId,
      ...organization,
    }),
  ),
});

/**
 * Legacy 活动组织只能从服务端返回的可访问组织中选择：已保存组织 -> 默认组织 -> 第一项。
 * 本地 metadata 只是导航偏好，不能把已移除的组织重新注入会话。
 */
const resolveLegacyActiveOrganizationId = (
  currentUser: AuthSession['currentUser'],
  savedOrganizationId?: string,
) => {
  const organizationIds = new Set(
    (currentUser.organizations ?? []).map(
      (organization) => organization.organizationId,
    ),
  );
  if (savedOrganizationId && organizationIds.has(savedOrganizationId)) {
    return savedOrganizationId;
  }
  if (
    currentUser.defaultOrganizationId &&
    organizationIds.has(currentUser.defaultOrganizationId)
  ) {
    return currentUser.defaultOrganizationId;
  }
  return currentUser.organizations?.[0]?.organizationId;
};

/**
 * XOne 当前组织必须来自 Token.organizationId；metadata 只能与其交叉校验，不能覆盖 Token。
 * 登录 Token 没有 organizationId 时保持 Platform Scope，不把默认组织误当成已切换组织。
 */
const resolveXoneActiveOrganizationId = (
  currentUser: AuthSession['currentUser'],
  accessToken: string | undefined,
  savedOrganizationId?: string,
) => {
  const claim = decodeXoneTokenClaims(accessToken).organizationId;
  const tokenOrganizationId =
    claim === undefined || claim === null ? undefined : String(claim).trim();
  if (!tokenOrganizationId) {
    if (savedOrganizationId) {
      throw new XoneTokenClaimsError(
        'XOne Token 未携带 organizationId，但本地会话存在活动组织，请重新登录',
      );
    }
    return undefined;
  }
  if (savedOrganizationId && savedOrganizationId !== tokenOrganizationId) {
    throw new XoneTokenClaimsError(
      'XOne Token organizationId 与本地活动组织不一致，请重新登录',
    );
  }
  if (
    !currentUser.organizations.some(
      (organization) =>
        organization.organizationId === tokenOrganizationId,
    )
  ) {
    throw new XoneTokenClaimsError(
      'XOne Token 指向的组织不在当前可访问组织列表中，请重新登录',
    );
  }
  return tokenOrganizationId;
};

/**
 * 使用注入的 Backend 创建会话服务，生产默认走 resolveAuthBackend，测试可传入假实现。
 */
export const createAuthSessionService = (backend: AuthBackend) => {
  /** 核心链路：Backend 快照 -> 安全字段归一化 -> 可信活动组织 -> AuthSession。 */
  const load = async (
    options?: AuthBackendRequestOptions,
  ): Promise<AuthSession> => {
    const metadata = getAuthSessionMetadata();
    if (metadata && metadata.backend !== backend.kind) {
      clearAccessToken();
      clearAuthSessionMetadata();
      throw new AuthBackendMismatchError();
    }
    const accessToken = getAccessToken();
    const xoneOrganizationId =
      backend.kind === 'xone'
        ? decodeXoneTokenClaims(accessToken).organizationId
        : undefined;
    const isXoneOrganizationToken =
      xoneOrganizationId !== undefined && xoneOrganizationId !== null;
    if (
      isXoneOrganizationToken &&
      (!metadata?.organizations || metadata.organizations.length === 0)
    ) {
      throw new XoneTokenClaimsError(
        'XOne 组织会话缺少已保存的组织列表，请重新登录',
      );
    }
    // 组织 Token 调用 listOrgs 会返回 data:null；整页刷新时直接使用登录后保存的真实列表。
    const snapshot = isXoneOrganizationToken
      ? createStoredXoneSnapshot(metadata?.organizations ?? [])
      : await backend.loadCurrentUser(options);
    const currentUser = normalizeAuthCurrentUser(
      snapshot,
      accessToken,
      metadata
        ? {
            userId: metadata.userId,
            projectId: metadata.projectId,
            identifier: metadata.identifier,
          }
        : undefined,
    );
    const activeOrganizationId =
      backend.kind === 'xone'
        ? resolveXoneActiveOrganizationId(
            currentUser,
            accessToken,
            metadata?.activeOrganizationId,
          )
        : resolveLegacyActiveOrganizationId(
            currentUser,
            metadata?.activeOrganizationId,
          );
    return createAuthSession(
      backend,
      currentUser,
      activeOrganizationId,
    );
  };

  /**
   * 核心登录事务：调用 Backend -> 暂存 Token/最小元数据 -> 加载身份和组织 -> 提交会话。
   * 任一步失败都清除本地认证状态，禁止留下“有 Token、无有效用户”的半登录状态。
   */
  const login = async (
    input: AuthBackendLoginInput,
    options?: AuthBackendRequestOptions,
  ): Promise<AuthSession> => {
    try {
      const loginResult = await backend.login(input, options);
      // 登录 Token 是 XOne userId/projectId/sub 的唯一来源；先校验，再写入本地会话。
      const xoneLoginIdentity =
        backend.kind === 'xone'
          ? assertXoneLoginToken(
              loginResult.accessToken,
              input.projectId === undefined ? '' : String(input.projectId),
              input.username,
            )
          : undefined;
      setAccessToken(loginResult.accessToken);
      saveAuthSessionMetadata({
        backend: backend.kind,
        userId: xoneLoginIdentity?.userId,
        projectId: xoneLoginIdentity?.projectId,
        identifier: xoneLoginIdentity?.identifier ?? input.username,
      });

      const session = await load(options);
      saveAuthSessionMetadata({
        backend: backend.kind,
        userId: session.currentUser.userId,
        projectId: session.projectId,
        identifier: session.currentUser.username,
        activeOrganizationId: session.activeOrganizationId,
        organizations:
          backend.kind === 'xone'
            ? toStoredOrganizations(session.currentUser)
            : undefined,
      });
      return session;
    } catch (error) {
      clearAccessToken();
      clearAuthSessionMetadata();
      throw error;
    }
  };

  /**
   * 核心链路：保存旧 Token -> 后端切换 -> 暂存新 Token -> 提交会话。
   * XOne 沿用登录时已验证的组织列表，不再调用 listOrgs（组织级 Token 无该接口权限）；
   * Legacy 仍刷新用户获取新的默认组织。新 Token 后的会话重建失败会恢复旧 Token。
   */
  const switchOrganization = async (
    organizationId: string,
    options?: AuthBackendRequestOptions,
  ): Promise<AuthSession> => {
    const previousToken = getAccessToken();
    const previousMetadata = getAuthSessionMetadata();
    const previousXoneIdentity =
      previousMetadata?.userId &&
      previousMetadata.projectId &&
      previousMetadata.identifier
        ? {
            userId: previousMetadata.userId,
            projectId: previousMetadata.projectId,
            identifier: previousMetadata.identifier,
          }
        : undefined;
    if (backend.kind === 'xone' && !previousXoneIdentity) {
      throw new Error(
        'XOne 会话缺少 userId、projectId 或 identifier，请重新登录',
      );
    }
    if (
      backend.kind === 'xone' &&
      (!previousMetadata?.organizations ||
        previousMetadata.organizations.length === 0)
    ) {
      throw new Error('XOne 会话缺少已保存的组织列表，请重新登录');
    }
    const switchResult = await backend.switchOrganization(
      organizationId,
      options,
    );
    let tokenReplaced = false;
    try {
      if (backend.kind === 'xone') {
        // 上方已在发请求前拦截；这里重复收窄类型，禁止以空 identifier 继续校验。
        if (!previousXoneIdentity) {
          throw new Error(
            'XOne 会话缺少 userId、projectId 或 identifier，请重新登录',
          );
        }
        assertXoneOrganizationSwitchToken(
          switchResult.accessToken,
          previousXoneIdentity.identifier,
          String(organizationId),
        );
      }
      if (switchResult.accessToken) {
        setAccessToken(switchResult.accessToken);
        tokenReplaced = true;
      }
      // XOne 组织级 Token 的 listOrgs 返回 data:null，因此只恢复登录时保存的真实列表；
      // Legacy 切换只更新默认组织，仍需从旧 API 刷新用户。
      let currentUser: AuthSession['currentUser'];
      if (backend.kind === 'xone') {
        if (
          !previousXoneIdentity ||
          !previousMetadata?.organizations ||
          previousMetadata.organizations.length === 0
        ) {
          throw new Error('XOne 会话缺少已保存的组织列表，请重新登录');
        }
        currentUser = normalizeAuthCurrentUser(
          createStoredXoneSnapshot(previousMetadata.organizations),
          getAccessToken(),
          previousXoneIdentity,
        );
      } else {
        const snapshot = await backend.loadCurrentUser(options);
        currentUser = normalizeAuthCurrentUser(
          snapshot,
          getAccessToken(),
          previousXoneIdentity,
        );
      }
      const normalizedOrganizationId = String(switchResult.organizationId);
      const organizationExists = currentUser.organizations.some(
        (organization) =>
          organization.organizationId === normalizedOrganizationId,
      );
      if (!organizationExists) {
        throw new Error('切换成功，但已保存的组织列表不包含目标组织');
      }
      saveAuthSessionMetadata({
        backend: backend.kind,
        userId: currentUser.userId ?? previousMetadata?.userId,
        projectId: currentUser.projectId ?? previousMetadata?.projectId,
        identifier:
          currentUser.username || previousMetadata?.identifier,
        activeOrganizationId: normalizedOrganizationId,
        organizations:
          backend.kind === 'xone'
            ? toStoredOrganizations(currentUser)
            : undefined,
      });
      return createAuthSession(
        backend,
        currentUser,
        normalizedOrganizationId,
      );
    } catch (error) {
      if (tokenReplaced) {
        if (previousToken) setAccessToken(previousToken);
        else clearAccessToken();
      }
      throw error;
    }
  };

  return { login, load, switchOrganization };
};

/** 使用当前构建配置执行完整登录事务；页面不再单独管理 Token 提交顺序。 */
export const loginAuthSession = (
  input: AuthBackendLoginInput,
  options?: AuthBackendRequestOptions,
) => createAuthSessionService(resolveAuthBackend()).login(input, options);

/** 使用当前构建配置加载会话；应用初始化和运行期刷新共用该入口。 */
export const loadAuthSession = (options?: AuthBackendRequestOptions) =>
  createAuthSessionService(resolveAuthBackend()).load(options);

/** 使用当前构建配置切换组织；组织选择组件只消费这个会话入口。 */
export const switchAuthSessionOrganization = (
  organizationId: string,
  options?: AuthBackendRequestOptions,
) =>
  createAuthSessionService(resolveAuthBackend()).switchOrganization(
    organizationId,
    options,
  );
