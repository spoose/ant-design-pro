import type { Request, Response } from 'express';

/** XOne 通用响应信封；历史响应确认成功业务码为 200。 */
type XoneResult<T> = {
  code: number;
  data: T;
  msg: string;
};

/** 离线开发唯一允许登录的演示账户；不复用任何内网真实密码。 */
export const XONE_OFFLINE_TEST_ACCOUNT = {
  userId: 1,
  projectId: 1111,
  authType: 'password',
  identifier: 'zhangshan',
  credential: '123456',
} as const;

/**
 * 离线组织目录来自 2026-08-24 的 listOrgs 历史响应。
 * id 在真实响应中是字符串，虽然 OpenAPI 将它声明为 int64，因此 mock 保留真实类型。
 */
const historicalOrganizations = [
  {
    createTime: '2026-08-06 09:40:44',
    defaultFlag: false,
    id: '2',
    organizationCode: 'org002',
    organizationName: '兰溪市聚数数字产业科技有限公司',
    remark: '政务低空，集约运维',
    updateTime: '2026-08-06 09:40:48',
  },
  {
    createTime: '2026-08-06 09:40:27',
    defaultFlag: true,
    id: '1',
    organizationCode: 'org001',
    organizationName: '兰溪市城发集团',
    remark: '原城投集团',
    updateTime: '2026-08-06 09:40:29',
  },
] as const;

/**
 * mockTokenSessions 是本地 Mock 的 Token 会话表：
 * login 写入未选择组织的会话，selectAndChangeOrg 写入携带 orgId 的新会话。
 * 旧 Token 故意保留，用来验证前端不能依赖服务端立即销毁旧 Token。
 */
type MockTokenSession = {
  userId: number;
  projectId: number;
  identifier: string;
  authType: string;
  orgId?: string;
};

const mockTokenSessions = new Map<string, MockTokenSession>();

/**
 * 离线 Token 只模拟 XOne 已观察到的公开 claims；签名字符串没有验签能力。
 * projectId 保存在 Mock 服务端会话中，切换后的 payload 只携带 sub + organizationId。
 */
let mockTokenSequence = 0;
const issueMockToken = (session: MockTokenSession) => {
  mockTokenSequence += 1;
  const encode = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${encode({ alg: 'HS256' })}.${encode({
    ...(session.orgId
      ? { organizationId: Number(session.orgId) }
      : { userId: session.userId, projectId: session.projectId }),
    authorities: [],
    sub: session.identifier,
    iat: 0,
    exp: 4102444800,
    iss: 'jushu-xone-offline',
    jti: `offline-${mockTokenSequence}`,
  })}.offline-signature`;
  mockTokenSessions.set(token, session);
  return token;
};

/** 从 Authorization: Bearer <token> 读取当前 Mock 会话。 */
const getMockSession = (request: Request) => {
  const match = request.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ? mockTokenSessions.get(match[1]) : undefined;
};

/** 保持 XOne 的 code/data/msg 成功结构，避免页面依赖现有 success/data/traceId。 */
const sendSuccess = <T>(response: Response, data: T) => {
  const result: XoneResult<T> = { code: 200, data, msg: '操作成功' };
  response.send(result);
};

/** 登录凭证错误仍使用 HTTP 200，由 XOne Backend 根据业务 code 显示登录错误。 */
const sendBadCredentials = (response: Response) => {
  response.send({
    code: 401,
    data: null,
    msg: '账号、密码或项目 ID 错误',
  });
};

const sendUnauthorized = (response: Response) => {
  response.status(401).send({
    code: 401,
    data: null,
    msg: '未登录或 Token 无效',
  });
};

/**
 * 核心链路第 1 步：projectId + identifier + credential -> token A。
 * 离线 Mock 只校验必填字段，不保存或返回 credential。
 */
const login = (request: Request, response: Response) => {
  const { projectId, authType, identifier, credential } = request.body ?? {};
  if (
    !Number.isSafeInteger(projectId) ||
    typeof authType !== 'string' ||
    !authType ||
    typeof identifier !== 'string' ||
    !identifier ||
    typeof credential !== 'string' ||
    !credential
  ) {
    response.status(400).send({
      code: 400,
      data: null,
      msg: 'projectId、authType、identifier、credential 为必填字段',
    });
    return;
  }

  if (
    projectId !== XONE_OFFLINE_TEST_ACCOUNT.projectId ||
    authType !== XONE_OFFLINE_TEST_ACCOUNT.authType ||
    identifier !== XONE_OFFLINE_TEST_ACCOUNT.identifier ||
    credential !== XONE_OFFLINE_TEST_ACCOUNT.credential
  ) {
    sendBadCredentials(response);
    return;
  }

  const token = issueMockToken({
    userId: XONE_OFFLINE_TEST_ACCOUNT.userId,
    projectId,
    identifier,
    authType,
  });
  sendSuccess(response, { token });
};

/** 核心链路第 2 步：token A -> 当前 projectId 下的历史组织列表。 */
const listOrganizations = (request: Request, response: Response) => {
  const currentSession = getMockSession(request);
  if (!currentSession) {
    sendUnauthorized(response);
    return;
  }
  // 与已观察到的内网行为一致：切换后的组织 Token 返回 data:null。
  if (currentSession.orgId) {
    sendSuccess(response, null);
    return;
  }
  sendSuccess(
    response,
    historicalOrganizations.map((organization) => ({ ...organization })),
  );
};

/**
 * 核心链路第 3 步：token A + orgId -> token B。
 * 历史记录中没有该接口响应，因此响应结构严格采用 OpenAPI 的 data.token。
 */
const selectAndChangeOrganization = (
  request: Request,
  response: Response,
) => {
  const currentSession = getMockSession(request);
  if (!currentSession) {
    sendUnauthorized(response);
    return;
  }

  const requestedOrgId = String(request.body?.organizationId ?? '');
  const organizationExists = historicalOrganizations.some(
    (organization) => organization.id === requestedOrgId,
  );
  if (!organizationExists) {
    response.status(403).send({
      code: 403,
      data: null,
      msg: '组织不存在或当前用户无权进入',
    });
    return;
  }

  const token = issueMockToken({
    ...currentSession,
    orgId: requestedOrgId,
  });
  sendSuccess(response, { token });
};

export default {
  'POST /web/auth/login': login,
  'POST /web/system/organization/listOrgs': listOrganizations,
  'POST /web/system/organization/selectAndChangeOrg':
    selectAndChangeOrganization,
};
