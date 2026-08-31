import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import xoneMock, { XONE_OFFLINE_TEST_ACCOUNT } from '../mock/xone';

type MockHandler = (request: Request, response: Response) => void;

const loginHandler = xoneMock['POST /web/auth/login'] as MockHandler;
const listOrganizationsHandler = xoneMock[
  'POST /web/system/organization/listOrgs'
] as MockHandler;
const switchOrganizationHandler = xoneMock[
  'POST /web/system/organization/selectAndChangeOrg'
] as MockHandler;

const invokeLogin = (body: Record<string, unknown>) => {
  const send = vi.fn();
  loginHandler({ body } as Request, { send } as unknown as Response);
  return send.mock.calls[0]?.[0];
};

describe('XOne offline login mock', () => {
  it('issues a login Token only for the fixed demo account', () => {
    const response = invokeLogin({
      projectId: XONE_OFFLINE_TEST_ACCOUNT.projectId,
      authType: XONE_OFFLINE_TEST_ACCOUNT.authType,
      identifier: XONE_OFFLINE_TEST_ACCOUNT.identifier,
      credential: XONE_OFFLINE_TEST_ACCOUNT.credential,
    });

    expect(response).toMatchObject({
      code: 200,
      data: { token: expect.any(String) },
      msg: '操作成功',
    });
  });

  it.each([
    { projectId: 2222 },
    { identifier: 'another-user' },
    { credential: 'wrong-password' },
  ])('rejects a mismatched credential field: %o', (override) => {
    const response = invokeLogin({
      projectId: XONE_OFFLINE_TEST_ACCOUNT.projectId,
      authType: XONE_OFFLINE_TEST_ACCOUNT.authType,
      identifier: XONE_OFFLINE_TEST_ACCOUNT.identifier,
      credential: XONE_OFFLINE_TEST_ACCOUNT.credential,
      ...override,
    });

    expect(response).toEqual({
      code: 401,
      data: null,
      msg: '账号、密码或项目 ID 错误',
    });
  });

  it('matches the observed null listOrgs response after switching organizations', () => {
    const loginResponse = invokeLogin({
      projectId: XONE_OFFLINE_TEST_ACCOUNT.projectId,
      authType: XONE_OFFLINE_TEST_ACCOUNT.authType,
      identifier: XONE_OFFLINE_TEST_ACCOUNT.identifier,
      credential: XONE_OFFLINE_TEST_ACCOUNT.credential,
    });
    const loginToken = loginResponse.data.token as string;
    const switchSend = vi.fn();
    switchOrganizationHandler(
      {
        body: { organizationId: 1 },
        get: () => `Bearer ${loginToken}`,
      } as unknown as Request,
      { send: switchSend } as unknown as Response,
    );
    const organizationToken = switchSend.mock.calls[0]?.[0].data
      .token as string;
    const listSend = vi.fn();

    listOrganizationsHandler(
      {
        body: {},
        get: () => `Bearer ${organizationToken}`,
      } as unknown as Request,
      { send: listSend } as unknown as Response,
    );

    expect(listSend).toHaveBeenCalledWith({
      code: 200,
      data: null,
      msg: '操作成功',
    });
  });
});
