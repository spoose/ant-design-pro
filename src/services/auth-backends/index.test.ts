import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getConfiguredAuthBackendKind,
  resolveAuthBackend,
} from './index';
import { XoneAuthBackendError } from './xone';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({
  request: requestMock,
}));

describe('auth backends', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to legacy and accepts an explicit xone selection', () => {
    vi.stubEnv('AUTH_BACKEND', 'legacy');
    expect(getConfiguredAuthBackendKind()).toBe('legacy');
    expect(resolveAuthBackend().kind).toBe('legacy');

    vi.stubEnv('AUTH_BACKEND', 'xone');
    expect(getConfiguredAuthBackendKind()).toBe('xone');
    expect(resolveAuthBackend().kind).toBe('xone');
  });

  it('maps the common login input to the XOne request and access token', async () => {
    requestMock.mockResolvedValue({
      code: 200,
      data: { token: 'xone-token' },
      msg: '操作成功',
    });

    const result = await resolveAuthBackend('xone').login({
      projectId: 1111,
      authType: 'password',
      username: 'offline-user',
      password: 'offline-password',
    });

    expect(result).toEqual({
      accessToken: 'xone-token',
      tokenType: 'Bearer',
    });
    expect(requestMock).toHaveBeenCalledWith('/web/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: {
        projectId: 1111,
        authType: 'password',
        identifier: 'offline-user',
        credential: 'offline-password',
      },
    });
  });

  it('rejects XOne login before sending when projectId is missing', async () => {
    await expect(
      resolveAuthBackend('xone').login({
        authType: 'password',
        username: 'offline-user',
        password: 'offline-password',
      }),
    ).rejects.toThrow('XOne 登录必须提供有效的 projectId');
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('loads XOne organizations without calling the unavailable current-user API', async () => {
    requestMock.mockImplementation((url: string) => {
      if (url === '/web/system/organization/listOrgs') {
        return Promise.resolve({
          code: 200,
          data: [
            {
              id: '1',
              organizationCode: 'org001',
              organizationName: '组织一',
              defaultFlag: true,
            },
          ],
          msg: '操作成功',
        });
      }
      return Promise.reject(new Error(`unexpected request: ${url}`));
    });

    await expect(
      resolveAuthBackend('xone').loadCurrentUser({
        skipErrorHandler: true,
      }),
    ).resolves.toEqual({
      source: 'xone',
      organizations: [
        {
          id: '1',
          organizationCode: 'org001',
          organizationName: '组织一',
          defaultFlag: true,
        },
      ],
    });
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(
      '/web/system/organization/listOrgs',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: {},
        skipErrorHandler: true,
      },
    );
  });

  it('converts an XOne business failure into a typed backend error', async () => {
    requestMock.mockResolvedValue({
      code: 403,
      data: null,
      msg: '组织不存在或当前用户无权进入',
    });

    const error = await resolveAuthBackend('xone')
      .switchOrganization('999')
      .catch((reason) => reason);

    expect(error).toBeInstanceOf(XoneAuthBackendError);
    expect(error).toMatchObject({
      code: 403,
      message: '组织不存在或当前用户无权进入',
    });
  });

  it('returns the new XOne token after an organization switch', async () => {
    requestMock.mockResolvedValue({
      code: 200,
      data: { token: 'xone-switched-token' },
      msg: '操作成功',
    });

    await expect(
      resolveAuthBackend('xone').switchOrganization('1'),
    ).resolves.toEqual({
      organizationId: '1',
      accessToken: 'xone-switched-token',
    });
    expect(requestMock).toHaveBeenCalledWith(
      '/web/system/organization/selectAndChangeOrg',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: { organizationId: 1 },
      },
    );
  });

  it('keeps legacy semantics behind the same backend interface', async () => {
    requestMock
      .mockResolvedValueOnce({
        success: true,
        data: {
          accessToken: 'legacy-token',
          tokenType: 'Bearer',
        },
        traceId: 'login-trace',
      })
      .mockResolvedValueOnce({
        success: true,
        data: { userId: 'legacy-user' },
        traceId: 'user-trace',
      })
      .mockResolvedValueOnce({
        success: true,
        data: { defaultOrganizationId: 'organization-1' },
        traceId: 'switch-trace',
      });

    const backend = resolveAuthBackend('legacy');
    await expect(
      backend.login({
        projectId: 1111,
        authType: 'password',
        username: 'legacy-user',
        password: 'legacy-password',
      }),
    ).resolves.toEqual({
      accessToken: 'legacy-token',
      tokenType: 'Bearer',
    });
    await expect(backend.loadCurrentUser()).resolves.toEqual({
      source: 'legacy',
      currentUser: { userId: 'legacy-user' },
    });
    await expect(
      backend.switchOrganization('organization-1'),
    ).resolves.toEqual({
      organizationId: 'organization-1',
    });

    expect(requestMock).toHaveBeenNthCalledWith(1, '/api/login/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { account: 'legacy-user', password: 'legacy-password' },
    });
    expect(requestMock).toHaveBeenNthCalledWith(2, '/api/currentUser/get', {
      method: 'POST',
    });
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      '/api/users/me/default-organization/set',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: { organizationId: 'organization-1' },
      },
    );
  });
});
