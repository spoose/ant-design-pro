import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_APP_CODES } from '@/config/appCodes';
import type { AuthBackend } from '../auth-backends';
import {
  clearAuthSessionMetadata,
  getAuthSessionMetadata,
  saveAuthSessionMetadata,
} from '@/utils/authSessionMetadata';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '@/utils/authToken';
import {
  AuthBackendMismatchError,
  createAuthSessionService,
  normalizeAuthCurrentUser,
} from './index';

const createLegacyCurrentUser = (
  organizationId = 'organization-1',
): JushuAPI.AuthCurrentUser => ({
  userId: 'legacy-user',
  username: 'legacy-user',
  name: 'Legacy User',
  email: 'legacy@example.com',
  avatar: null,
  status: 'active',
  isSuperAdmin: false,
  platformPermissions: [],
  projectAppCodes: ['knowledge-search'],
  defaultOrganizationId: organizationId,
  organizations: [
    {
      organizationId,
      organizationCode: organizationId.toUpperCase(),
      organizationName: organizationId,
      permissions: ['page:home'],
      appCodes: ['file-review'],
      dataScopes: [],
      defaultDataScopeId: null,
    },
  ],
});

/** 生成仅供单元测试解码的假 JWT；不包含签名能力或真实认证信息。 */
const createUnsignedTestToken = (claims: Record<string, unknown>) => {
  const encode = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${encode({ alg: 'none' })}.${encode(claims)}.test-signature`;
};

describe('auth session normalization', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearAccessToken();
    clearAuthSessionMetadata();
  });

  it('normalizes XOne login identity and organizations', () => {
    const currentUser = normalizeAuthCurrentUser(
      {
        source: 'xone',
        organizations: [
          {
            id: '1',
            organizationCode: 'org001',
            organizationName: '组织一',
            defaultFlag: true,
          },
        ],
      },
      createUnsignedTestToken({ organizationId: 1, sub: 'xone-user' }),
      { userId: '7', projectId: '1111', identifier: 'xone-user' },
    );

    expect(currentUser).toMatchObject({
      projectId: '1111',
      userId: '7',
      username: 'xone-user',
      name: 'xone-user',
      isSuperAdmin: false,
      platformPermissions: [],
      projectAppCodes: [...ALL_APP_CODES],
      defaultOrganizationId: '1',
    });
    expect(currentUser).not.toHaveProperty('credential');
    expect(currentUser.organizations[0]).toMatchObject({
      organizationId: '1',
      organizationCode: 'org001',
      organizationName: '组织一',
      permissions: ['*'],
      appCodes: [...ALL_APP_CODES],
      defaultDataScopeId: '1',
    });
  });

  it('uses the verified XOne login identity instead of switch Token omissions', () => {
    const currentUser = normalizeAuthCurrentUser(
      {
        source: 'xone',
        organizations: [],
      },
      createUnsignedTestToken({
        organizationId: 1,
        sub: 'token-user',
      }),
      { userId: '9', projectId: '1111', identifier: 'token-user' },
    );

    expect(currentUser).toMatchObject({
      projectId: '1111',
      userId: '9',
      username: 'token-user',
      organizations: [],
    });
  });

  it('maps only the fixed offline XOne identity to Project Admin', () => {
    const currentUser = normalizeAuthCurrentUser(
      { source: 'xone', organizations: [] },
      createUnsignedTestToken({ sub: 'zhangshan' }),
      { userId: '1', projectId: '1111', identifier: 'zhangshan' },
    );

    expect(currentUser).toMatchObject({
      isSuperAdmin: true,
      platformPermissions: ['*'],
    });
  });

  it('rejects XOne normalization when the explicit login context is missing', () => {
    expect(() =>
      normalizeAuthCurrentUser(
        { source: 'xone', organizations: [] },
        createUnsignedTestToken({ sub: 'token-user' }),
      ),
    ).toThrow('XOne 会话缺少 userId、projectId、identifier，请重新登录');
  });

  it('throws a clear error instead of falling back when the XOne token is malformed', () => {
    expect(() =>
      normalizeAuthCurrentUser(
        {
          source: 'xone',
          organizations: [],
        },
        'malformed-token',
        { userId: '1', projectId: '1111', identifier: 'xone-user' },
      ),
    ).toThrow('登录 Token 缺失或格式错误，请重新登录');
  });

  it('throws a clear error when the XOne Token has no subject', () => {
    expect(() =>
      normalizeAuthCurrentUser(
        {
          source: 'xone',
          organizations: [],
        },
        createUnsignedTestToken({ projectId: 1111 }),
        { userId: '1', projectId: '1111', identifier: 'xone-user' },
      ),
    ).toThrow('XOne Token 缺少身份字段 sub，请重新登录');
  });

  it('uses the Legacy application fields without renaming them', () => {
    const legacyUser = createLegacyCurrentUser();
    const currentUser = normalizeAuthCurrentUser({
      source: 'legacy',
      currentUser: legacyUser,
    });

    expect(currentUser).not.toBe(legacyUser);
    expect(currentUser.projectAppCodes).toEqual([
      'integrated-operations',
      'knowledge-search',
    ]);
    expect(currentUser.organizations[0]?.appCodes).toEqual([
      'integrated-operations',
      'file-review',
    ]);
    expect(currentUser).toHaveProperty('projectAppCodes');
    expect(currentUser.organizations[0]).toHaveProperty('appCodes');
  });

  it('uses Legacy database app grants without inferring them from sadmin', () => {
    const legacyUser = createLegacyCurrentUser();
    legacyUser.isSuperAdmin = true;

    const withoutDatabaseGrant = normalizeAuthCurrentUser({
      source: 'legacy',
      currentUser: legacyUser,
    });

    expect(withoutDatabaseGrant.projectAppCodes).not.toContain(
      'drone-operations',
    );
    expect(withoutDatabaseGrant.organizations[0]?.appCodes).not.toContain(
      'drone-operations',
    );

    legacyUser.projectAppCodes.push('drone-operations');
    legacyUser.organizations[0]?.appCodes.push('drone-operations');
    const withDatabaseGrant = normalizeAuthCurrentUser({
      source: 'legacy',
      currentUser: legacyUser,
    });

    expect(withDatabaseGrant.projectAppCodes).toContain('drone-operations');
    expect(withDatabaseGrant.organizations[0]?.appCodes).toContain(
      'drone-operations',
    );
  });

  it('clears a token created by another configured backend', async () => {
    setAccessToken('legacy-token');
    saveAuthSessionMetadata({
      backend: 'legacy',
      identifier: 'legacy-user',
    });
    const backend = {
      kind: 'xone',
      login: vi.fn(),
      loadCurrentUser: vi.fn(),
      switchOrganization: vi.fn(),
    } satisfies AuthBackend;

    await expect(createAuthSessionService(backend).load()).rejects.toBeInstanceOf(
      AuthBackendMismatchError,
    );
    expect(getAccessToken()).toBeUndefined();
    expect(getAuthSessionMetadata()).toBeUndefined();
    expect(backend.loadCurrentUser).not.toHaveBeenCalled();
  });

  it('commits XOne login Token, identity, and default Organization as one transaction', async () => {
    const backend = {
      kind: 'xone',
      login: vi.fn().mockResolvedValue({
        accessToken: createUnsignedTestToken({
          userId: 1,
          projectId: 1111,
          sub: 'xone-user',
        }),
        tokenType: 'Bearer',
      }),
      loadCurrentUser: vi.fn().mockResolvedValue({
        source: 'xone',
        organizations: [
          {
            id: '2',
            organizationCode: 'org002',
            organizationName: '组织二',
            defaultFlag: false,
          },
          {
            id: '1',
            organizationCode: 'org001',
            organizationName: '组织一',
            defaultFlag: true,
          },
        ],
      }),
      switchOrganization: vi.fn(),
    } satisfies AuthBackend;

    const loginInput = {
      projectId: 1111,
      authType: 'password' as const,
      username: 'xone-user',
      password: 'secret',
    };
    const session = await createAuthSessionService(backend).login(
      loginInput,
      { skipErrorHandler: true },
    );

    expect(backend.login).toHaveBeenCalledWith(loginInput, {
      skipErrorHandler: true,
    });
    expect(getAccessToken()).toBe(
      createUnsignedTestToken({
        userId: 1,
        projectId: 1111,
        sub: 'xone-user',
      }),
    );
    expect(session).toMatchObject({
      backend: 'xone',
      projectId: '1111',
      currentUser: { userId: '1', defaultOrganizationId: '1' },
    });
    expect(session.activeOrganizationId).toBeUndefined();
    expect(getAuthSessionMetadata()).toEqual({
      backend: 'xone',
      userId: '1',
      projectId: '1111',
      identifier: 'xone-user',
      organizations: [
        {
          organizationId: '2',
          organizationCode: 'org002',
          organizationName: '组织二',
          defaultFlag: false,
        },
        {
          organizationId: '1',
          organizationCode: 'org001',
          organizationName: '组织一',
          defaultFlag: true,
        },
      ],
    });
  });

  it('restores the verified login identity when the persisted Token is an Organization Token', async () => {
    setAccessToken(
      createUnsignedTestToken({ organizationId: 2, sub: 'xone-user' }),
    );
    saveAuthSessionMetadata({
      backend: 'xone',
      userId: '1',
      projectId: '1111',
      identifier: 'xone-user',
      activeOrganizationId: '2',
      organizations: [
        {
          organizationId: '1',
          organizationCode: 'org001',
          organizationName: '组织一',
          defaultFlag: false,
        },
        {
          organizationId: '2',
          organizationCode: 'org002',
          organizationName: '组织二',
          defaultFlag: false,
        },
      ],
    });
    const backend = {
      kind: 'xone',
      login: vi.fn(),
      switchOrganization: vi.fn(),
      loadCurrentUser: vi.fn(),
    } satisfies AuthBackend;

    await expect(createAuthSessionService(backend).load()).resolves.toMatchObject(
      {
        backend: 'xone',
        projectId: '1111',
        activeOrganizationId: '2',
        currentUser: {
          userId: '1',
          username: 'xone-user',
        },
      },
    );
    expect(backend.loadCurrentUser).not.toHaveBeenCalled();
  });

  it('clears the partial login state when identity loading fails', async () => {
    const backend = {
      kind: 'xone',
      login: vi.fn().mockResolvedValue({
        accessToken: createUnsignedTestToken({
          userId: 1,
          projectId: 1111,
          sub: 'xone-user',
        }),
        tokenType: 'Bearer',
      }),
      loadCurrentUser: vi.fn().mockRejectedValue(new Error('load failed')),
      switchOrganization: vi.fn(),
    } satisfies AuthBackend;

    await expect(
      createAuthSessionService(backend).login({
        projectId: 1111,
        authType: 'password',
        username: 'xone-user',
        password: 'secret',
      }),
    ).rejects.toThrow('load failed');
    expect(getAccessToken()).toBeUndefined();
    expect(getAuthSessionMetadata()).toBeUndefined();
  });

  it('rejects an XOne login Token issued for another project', async () => {
    const backend = {
      kind: 'xone',
      login: vi.fn().mockResolvedValue({
        accessToken: createUnsignedTestToken({
          userId: 1,
          projectId: 2222,
          sub: 'xone-user',
        }),
        tokenType: 'Bearer',
      }),
      loadCurrentUser: vi.fn(),
      switchOrganization: vi.fn(),
    } satisfies AuthBackend;

    await expect(
      createAuthSessionService(backend).login({
        projectId: 1111,
        authType: 'password',
        username: 'xone-user',
        password: 'secret',
      }),
    ).rejects.toThrow(
      '登录 Token 中的 projectId 与登录输入不一致，请重新登录',
    );
    expect(backend.loadCurrentUser).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeUndefined();
    expect(getAuthSessionMetadata()).toBeUndefined();
  });

  it('rejects an XOne Token issued for another identifier', async () => {
    const backend = {
      kind: 'xone',
      login: vi.fn().mockResolvedValue({
        accessToken: createUnsignedTestToken({
          userId: 1,
          projectId: 1111,
          sub: 'another-user',
        }),
        tokenType: 'Bearer',
      }),
      loadCurrentUser: vi.fn().mockResolvedValue({
        source: 'xone',
        organizations: [],
      }),
      switchOrganization: vi.fn(),
    } satisfies AuthBackend;

    await expect(
      createAuthSessionService(backend).login({
        projectId: 1111,
        authType: 'password',
        username: 'xone-user',
        password: 'secret',
      }),
    ).rejects.toThrow(
      '登录 Token 中的 sub 与登录 identifier 不一致，请重新登录',
    );
    expect(getAccessToken()).toBeUndefined();
    expect(getAuthSessionMetadata()).toBeUndefined();
  });

  it('reuses the stored organizations without refreshing listOrgs for XOne', async () => {
    setAccessToken('token-a');
    saveAuthSessionMetadata({
      backend: 'xone',
      userId: '1',
      projectId: '1111',
      identifier: 'xone-user',
      organizations: [
        {
          organizationId: '2',
          organizationCode: 'org002',
          organizationName: '组织二',
          defaultFlag: true,
        },
      ],
    });
    const backend = {
      kind: 'xone',
      login: vi.fn(),
      switchOrganization: vi.fn().mockResolvedValue({
        organizationId: '2',
        accessToken: createUnsignedTestToken({
          organizationId: 2,
          sub: 'xone-user',
        }),
      }),
      loadCurrentUser: vi.fn(),
    } satisfies AuthBackend;

    const session = await createAuthSessionService(
      backend,
    ).switchOrganization('2');

    // 方案 B：组织级 Token 无 listOrgs 权限，切换时不再调用刷新。
    expect(backend.loadCurrentUser).not.toHaveBeenCalled();
    expect(session).toMatchObject({
      backend: 'xone',
      projectId: '1111',
      activeOrganizationId: '2',
      currentUser: {
        userId: '1',
        organizations: [
          expect.objectContaining({
            organizationId: '2',
            organizationName: '组织二',
          }),
        ],
      },
    });
  });

  it('rejects XOne switching before the request when the stored organizations are missing', async () => {
    setAccessToken('token-a');
    saveAuthSessionMetadata({
      backend: 'xone',
      userId: '1',
      projectId: '1111',
      identifier: 'xone-user',
    });
    const backend = {
      kind: 'xone',
      login: vi.fn(),
      switchOrganization: vi.fn(),
      loadCurrentUser: vi.fn(),
    } satisfies AuthBackend;

    await expect(
      createAuthSessionService(backend).switchOrganization('1'),
    ).rejects.toThrow('XOne 会话缺少已保存的组织列表，请重新登录');
    expect(backend.switchOrganization).not.toHaveBeenCalled();
    expect(backend.loadCurrentUser).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe('token-a');
    expect(getAuthSessionMetadata()).toEqual({
      backend: 'xone',
      userId: '1',
      projectId: '1111',
      identifier: 'xone-user',
    });
  });

  it('restores the previous Token when the stored list lacks the target Organization', async () => {
    setAccessToken('token-a');
    saveAuthSessionMetadata({
      backend: 'xone',
      userId: '1',
      projectId: '1111',
      identifier: 'xone-user',
      organizations: [
        {
          organizationId: '1',
          organizationCode: 'org001',
          organizationName: '组织一',
          defaultFlag: true,
        },
      ],
    });
    const backend = {
      kind: 'xone',
      login: vi.fn(),
      switchOrganization: vi.fn().mockResolvedValue({
        organizationId: '2',
        accessToken: createUnsignedTestToken({
          organizationId: 2,
          sub: 'xone-user',
        }),
      }),
      loadCurrentUser: vi.fn().mockResolvedValue({
        source: 'xone',
        organizations: [{ id: '1', organizationName: '组织一' }],
      }),
    } satisfies AuthBackend;

    await expect(
      createAuthSessionService(backend).switchOrganization('2'),
    ).rejects.toThrow('切换成功，但已保存的组织列表不包含目标组织');
    expect(getAccessToken()).toBe('token-a');
    expect(backend.loadCurrentUser).not.toHaveBeenCalled();
  });

  it('rejects a switch Token for another Organization before replacing the old Token', async () => {
    setAccessToken('token-a');
    saveAuthSessionMetadata({
      backend: 'xone',
      userId: '1',
      projectId: '1111',
      identifier: 'xone-user',
      organizations: [
        {
          organizationId: '1',
          organizationCode: 'org001',
          organizationName: '组织一',
          defaultFlag: true,
        },
      ],
    });
    const backend = {
      kind: 'xone',
      login: vi.fn(),
      switchOrganization: vi.fn().mockResolvedValue({
        organizationId: '1',
        accessToken: createUnsignedTestToken({
          organizationId: 2,
          sub: 'xone-user',
        }),
      }),
      loadCurrentUser: vi.fn(),
    } satisfies AuthBackend;

    await expect(
      createAuthSessionService(backend).switchOrganization('1'),
    ).rejects.toThrow(
      '切换组织后的 Token organizationId 与目标组织不一致，请重试',
    );
    expect(getAccessToken()).toBe('token-a');
    expect(backend.loadCurrentUser).not.toHaveBeenCalled();
  });

  it('rejects a switch Token for another login subject', async () => {
    setAccessToken('token-a');
    saveAuthSessionMetadata({
      backend: 'xone',
      userId: '1',
      projectId: '1111',
      identifier: 'xone-user',
      organizations: [
        {
          organizationId: '1',
          organizationCode: 'org001',
          organizationName: '组织一',
          defaultFlag: true,
        },
      ],
    });
    const backend = {
      kind: 'xone',
      login: vi.fn(),
      switchOrganization: vi.fn().mockResolvedValue({
        organizationId: '1',
        accessToken: createUnsignedTestToken({
          organizationId: 1,
          sub: 'another-user',
        }),
      }),
      loadCurrentUser: vi.fn(),
    } satisfies AuthBackend;

    await expect(
      createAuthSessionService(backend).switchOrganization('1'),
    ).rejects.toThrow(
      '切换组织后的 Token 用户与当前登录用户不一致，请重新登录',
    );
    expect(getAccessToken()).toBe('token-a');
    expect(backend.loadCurrentUser).not.toHaveBeenCalled();
  });

  it('does not call switchOrganization when the verified XOne identity is incomplete', async () => {
    setAccessToken('token-a');
    saveAuthSessionMetadata({
      backend: 'xone',
      projectId: '1111',
      identifier: 'xone-user',
    });
    const backend = {
      kind: 'xone',
      login: vi.fn(),
      switchOrganization: vi.fn(),
      loadCurrentUser: vi.fn(),
    } satisfies AuthBackend;

    await expect(
      createAuthSessionService(backend).switchOrganization('1'),
    ).rejects.toThrow(
      'XOne 会话缺少 userId、projectId 或 identifier，请重新登录',
    );
    expect(backend.switchOrganization).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe('token-a');
  });

  it('keeps the Legacy token when its organization switch returns no token', async () => {
    setAccessToken('legacy-token');
    saveAuthSessionMetadata({
      backend: 'legacy',
      identifier: 'legacy-user',
      activeOrganizationId: 'organization-1',
    });
    const backend = {
      kind: 'legacy',
      login: vi.fn(),
      switchOrganization: vi.fn().mockResolvedValue({
        organizationId: 'organization-2',
      }),
      loadCurrentUser: vi.fn().mockResolvedValue({
        source: 'legacy',
        currentUser: createLegacyCurrentUser('organization-2'),
      }),
    } satisfies AuthBackend;

    const session = await createAuthSessionService(
      backend,
    ).switchOrganization('organization-2');

    expect(getAccessToken()).toBe('legacy-token');
    expect(session.activeOrganizationId).toBe('organization-2');
  });
});
