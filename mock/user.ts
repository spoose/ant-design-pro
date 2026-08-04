import type { Request, Response } from 'express';
import { waitTime, defaultUser } from './utils';

const { ANT_DESIGN_PRO_ONLY_DO_NOT_USE_IN_YOUR_PRODUCTION } = process.env;

const organizationCatalog = {
  'organization-1': {
    organizationId: 'organization-1',
    organizationCode: 'ORG1',
    organizationName: '组织一',
    defaultDataScopeId: 'department-1',
    dataScopes: [
      {
        dataScopeId: 'department-1',
        dataScopeCode: 'GROUP1',
        dataScopeName: 'Group 1',
        type: 'department',
      },
      {
        dataScopeId: 'department-2',
        dataScopeCode: 'GROUP2',
        dataScopeName: 'Group 2',
        type: 'department',
      },
    ],
  },
  'organization-2': {
    organizationId: 'organization-2',
    organizationCode: 'ORG2',
    organizationName: '组织二',
    defaultDataScopeId: 'organization-2',
    dataScopes: [
      {
        dataScopeId: 'organization-2',
        dataScopeCode: 'ORG2',
        dataScopeName: '组织二',
        type: 'organization',
      },
    ],
  },
} as const;

type OrganizationId = keyof typeof organizationCatalog;
type MockUsername = 'admin' | 'operator' | 'user' | 'users2';

type MockGrant = {
  permissions: readonly string[];
  skillCodes: readonly string[];
};

type MockAccount = {
  password: string;
  currentAuthority: 'admin' | 'user';
  accessToken: string;
  // Platform 授权与下面逐 Organization grants 独立。
  platformPermissions: readonly string[];
  platformSkillCodes: readonly string[];
  defaultOrganizationId?: OrganizationId;
  profile: {
    userId: string;
    username: MockUsername;
    name: string;
    email: string;
    title: string;
  };
  // 当前 mock 直接描述用户在各 Organization 的有效授权，不在前端合并 DataScope 权限。
  grants: Partial<Record<OrganizationId, MockGrant>>;
};

const mockAccounts: Record<MockUsername, MockAccount> = {
  admin: {
    password: 'ant.design',
    currentAuthority: 'admin',
    accessToken: 'mock-admin-access-token',
    platformPermissions: [
      'platform:organization:create',
      'platform:organization:update',
      'platform:organization:delete',
      'platform:user:manage',
      'platform:permission:grant',
      'platform:audit:view',
    ],
    platformSkillCodes: ['knowledge-search'],
    defaultOrganizationId: 'organization-1',
    profile: {
      userId: '00000001',
      username: 'admin',
      name: 'Admin User',
      email: 'admin@example.com',
      title: 'Administrator',
    },
    grants: {
      'organization-1': {
        permissions: [
          'organization:user:manage',
          'organization:role:manage',
          'organization:permission:grant',
          'organization:settings:update',
          'page:dashboard-analysis',
          'page:dashboard-workplace',
          'page:ai-assistant',
          'page:admin',
        ],
        skillCodes: [
          'file-review',
          'document-summary',
          'knowledge-search',
        ],
      },
      'organization-2': {
        permissions: [
          'organization:user:manage',
          'organization:role:manage',
          'page:dashboard-analysis',
          'page:dashboard-monitor',
          'page:ai-assistant',
          'page:admin',
        ],
        skillCodes: ['file-review', 'knowledge-search'],
      },
    },
  },
  user: {
    password: 'ant.design',
    currentAuthority: 'user',
    accessToken: 'mock-user-access-token',
    platformPermissions: [],
    platformSkillCodes: [],
    // 普通用户登录后直接进入后端指定的默认 Organization 首页。
    defaultOrganizationId: 'organization-1',
    profile: {
      userId: '00000002',
      username: 'user',
      name: 'Standard User',
      email: 'user@example.com',
      title: 'User',
    },
    grants: {
      'organization-1': {
        permissions: [
          'page:dashboard-analysis',
          'page:dashboard-workplace',
          'page:ai-assistant',
        ],
        skillCodes: ['file-review', 'document-summary'],
      },
      'organization-2': {
        permissions: [
          'page:dashboard-analysis',
          'page:ai-assistant',
        ],
        skillCodes: ['knowledge-search'],
      },
    },
  },
  users2: {
    password: 'ant.design',
    currentAuthority: 'user',
    accessToken: 'mock-users2-access-token',
    platformPermissions: [],
    platformSkillCodes: [],
    defaultOrganizationId: 'organization-2',
    profile: {
      userId: '00000004',
      username: 'users2',
      name: 'Organization 2 User',
      email: 'users2@example.com',
      title: 'Organization Member',
    },
    // 该账号只属于 organization-2，用于验证单组织用户的默认落点与权限隔离。
    grants: {
      'organization-2': {
        permissions: ['page:dashboard-analysis', 'page:ai-assistant'],
        skillCodes: ['knowledge-search'],
      },
    },
  },
  operator: {
    password: 'ant.design',
    currentAuthority: 'user',
    accessToken: 'mock-operator-access-token',
    platformPermissions: [],
    platformSkillCodes: [],
    defaultOrganizationId: 'organization-1',
    profile: {
      userId: '00000003',
      username: 'operator',
      name: 'Operator User',
      email: 'operator@example.com',
      title: 'Operator',
    },
    grants: {
      'organization-1': {
        permissions: [
          'organization:user:manage',
          'organization:role:manage',
          'page:dashboard-analysis',
          'page:dashboard-monitor',
          'page:operations-config',
          'page:ai-assistant',
        ],
        skillCodes: ['document-summary', 'knowledge-search'],
      },
    },
  },
};

const accessTokenUsers: Record<string, MockUsername> = {
  'mock-admin-access-token': 'admin',
  'mock-user-access-token': 'user',
  'mock-operator-access-token': 'operator',
  'mock-users2-access-token': 'users2',
};

// 默认组织属于服务端用户偏好；mock 以用户名为键模拟数据库持久化。
const defaultOrganizationIds: Partial<Record<MockUsername, OrganizationId>> =
  {};

export const getMockUsernameByAccessToken = (accessToken?: string) =>
  accessToken ? accessTokenUsers[accessToken] : undefined;

const getBearerToken = (req: Request) => {
  const match = req.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
};

const getAuthenticatedUsername = (req: Request) =>
  getMockUsernameByAccessToken(getBearerToken(req)) ??
  (ANT_DESIGN_PRO_ONLY_DO_NOT_USE_IN_YOUR_PRODUCTION === 'site'
    ? 'admin'
    : undefined);

const getOrganizations = (username: MockUsername) => {
  const grants = mockAccounts[username].grants;
  return (Object.entries(grants) as [OrganizationId, MockGrant][]).map(
    ([organizationId, grant]) => ({
      ...organizationCatalog[organizationId],
      permissions: [...grant.permissions],
      skillCodes: [...grant.skillCodes],
      dataScopes: organizationCatalog[organizationId].dataScopes.map(
        (dataScope) => ({ ...dataScope }),
      ),
    }),
  );
};

// GET /api/currentUser 的 mock 数据由 Bearer token、Platform 与 Organization 授权共同生成。
export const buildMockCurrentUser = (username: MockUsername) => {
  const account = mockAccounts[username];
  return {
    ...defaultUser,
    ...account.profile,
    status: 'active' as const,
    isSuperAdmin: username === 'admin',
    access: account.currentAuthority,
    platformPermissions: [...account.platformPermissions],
    platformSkillCodes: [...account.platformSkillCodes],
    organizations: getOrganizations(username),
    defaultOrganizationId:
      defaultOrganizationIds[username] ??
      account.defaultOrganizationId ??
      null,
  };
};

// 代码中会兼容本地 service mock 以及部署站点的静态数据
export default {
  // 支持值为 Object 和 Array
  'GET /api/currentUser': (req: Request, res: Response) => {
    const username = getAuthenticatedUsername(req);
    if (!username) {
      res.status(401).send({
        data: {
          isLogin: false,
        },
        errorCode: '401',
        errorMessage: '请先登录！',
        success: false,
      });
      return;
    }
    res.send({
      success: true,
      data: buildMockCurrentUser(username),
    });
  },
  'PUT /api/users/me/default-organization': (req: Request, res: Response) => {
    const username = getAuthenticatedUsername(req);
    if (!username) {
      res.status(401).send({
        errorCode: '401',
        errorMessage: '请先登录！',
        success: false,
      });
      return;
    }
    const { organizationId } = req.body;
    const organization = getOrganizations(username).find(
      (item) => item.organizationId === organizationId,
    );
    if (!organization) {
      res.status(400).send({
        errorCode: '400',
        errorMessage: '组织不存在或当前用户无权进入',
        success: false,
      });
      return;
    }
    defaultOrganizationIds[username] = organization.organizationId;
    res.send({
      success: true,
      data: { defaultOrganizationId: organization.organizationId },
    });
  },
  // GET POST 可省略
  'GET /api/users': [
    {
      key: '1',
      name: 'Zhihe',
      age: 32,
      address: 'Los Angeles No. 1 Lake Park',
    },
    {
      key: '2',
      name: 'Jim Green',
      age: 42,
      address: 'London No. 1 Lake Park',
    },
    {
      key: '3',
      name: 'Joe Black',
      age: 32,
      address: 'Sidney No. 1 Lake Park',
    },
  ],
  'POST /api/login/account': async (req: Request, res: Response) => {
    const { account, password } = req.body;
    await waitTime(2000);
    const normalizedAccount =
      typeof account === 'string' ? account.toLowerCase() : '';
    const username = Object.keys(mockAccounts).find((candidate) => {
      const mockAccount = mockAccounts[candidate as MockUsername];
      return (
        candidate === normalizedAccount ||
        mockAccount.profile.email === normalizedAccount
      );
    }) as MockUsername | undefined;
    const mockAccount = username ? mockAccounts[username] : undefined;
    if (mockAccount && password === mockAccount.password) {
      res.send({
        success: true,
        data: {
          accessToken: mockAccount.accessToken,
          tokenType: 'Bearer',
          expiresIn: 900,
          expiresAt: new Date(Date.now() + 900_000).toISOString(),
        },
        traceId: 'mock-login-trace-id',
      });
      return;
    }
    res.status(401).send({
      success: false,
      errorCode: 'BAD_CREDENTIALS',
      errorMessage: '用户名或密码错误',
      traceId: 'mock-login-error-trace-id',
    });
  },
  'POST /api/login/outLogin': (_req: Request, res: Response) => {
    // Bearer-only mock 不维护服务端会话；前端退出时清除本地 token。
    res.send({
      success: true,
      data: { loggedOut: true, serverTokenRevoked: false },
      traceId: 'mock-logout-trace-id',
    });
  },
  'GET /api/500': (_req: Request, res: Response) => {
    res.status(500).send({
      timestamp: 1513932555104,
      status: 500,
      error: 'error',
      message: 'error',
      path: '/base/category/list',
    });
  },
  'GET /api/404': (_req: Request, res: Response) => {
    res.status(404).send({
      timestamp: 1513932643431,
      status: 404,
      error: 'Not Found',
      message: 'No message available',
      path: '/base/category/list/2121212',
    });
  },
  'GET /api/403': (_req: Request, res: Response) => {
    res.status(403).send({
      timestamp: 1513932555104,
      status: 403,
      error: 'Forbidden',
      message: 'Forbidden',
      path: '/base/category/list',
    });
  },
  'GET /api/401': (_req: Request, res: Response) => {
    res.status(401).send({
      timestamp: 1513932555104,
      status: 401,
      error: 'Unauthorized',
      message: 'Unauthorized',
      path: '/base/category/list',
    });
  },

  'GET /api/login/captcha': async (_req: Request, res: Response) => {
    await waitTime(2000);
    return res.json('captcha-xxx');
  },
};
