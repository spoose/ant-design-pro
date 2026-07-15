import type { Request, Response } from 'express';
import { waitTime, defaultUser } from './utils';

const { ANT_DESIGN_PRO_ONLY_DO_NOT_USE_IN_YOUR_PRODUCTION } = process.env;

const contextCatalog = {
  'ctx-s1-g1': {
    id: 'ctx-s1-g1',
    systemId: 'system-1',
    systemCode: 'SYS1',
    systemName: 'System 1',
    scopeType: 'department',
    scopeId: 'group-1',
    scopeName: 'Group 1',
  },
  'ctx-s1-g2': {
    id: 'ctx-s1-g2',
    systemId: 'system-1',
    systemCode: 'SYS1',
    systemName: 'System 1',
    scopeType: 'department',
    scopeId: 'group-2',
    scopeName: 'Group 2',
  },
  'ctx-s2': {
    id: 'ctx-s2',
    systemId: 'system-2',
    systemCode: 'SYS2',
    systemName: 'System 2',
    scopeType: 'system',
  },
} as const;

type ContextId = keyof typeof contextCatalog;
type MockUsername = 'admin' | 'operator' | 'user';

type MockGrant = {
  permissions: readonly string[];
  skillCodes: readonly string[];
};

type MockAccount = {
  password: string;
  currentAuthority: 'admin' | 'user';
  accessToken: string;
  defaultContextId?: ContextId;
  profile: {
    userid: string;
    username: MockUsername;
    name: string;
    email: string;
    title: string;
  };
  // 当前 mock 直接描述用户在各 Context 的授权，不建立职位到权限的固定映射。
  grants: Partial<Record<ContextId, MockGrant>>;
};

const mockAccounts: Record<MockUsername, MockAccount> = {
  admin: {
    password: 'ant.design',
    currentAuthority: 'admin',
    accessToken: 'mock-admin-access-token',
    defaultContextId: 'ctx-s1-g1',
    profile: {
      userid: '00000001',
      username: 'admin',
      name: 'Admin User',
      email: 'admin@example.com',
      title: 'Administrator',
    },
    grants: {
      'ctx-s1-g1': {
        permissions: [
          'page:home',
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
      'ctx-s1-g2': {
        permissions: [
          'page:home',
          'page:dashboard-analysis',
          'page:dashboard-monitor',
          'page:operations-config',
          'page:ai-assistant',
          'page:admin',
        ],
        skillCodes: ['document-summary', 'knowledge-search'],
      },
      'ctx-s2': {
        permissions: [
          'page:home',
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
    profile: {
      userid: '00000002',
      username: 'user',
      name: 'Standard User',
      email: 'user@example.com',
      title: 'User',
    },
    grants: {
      'ctx-s1-g1': {
        permissions: [
          'page:home',
          'page:dashboard-analysis',
          'page:dashboard-workplace',
          'page:ai-assistant',
        ],
        skillCodes: ['file-review', 'document-summary'],
      },
      'ctx-s2': {
        permissions: [
          'page:home',
          'page:dashboard-analysis',
          'page:ai-assistant',
        ],
        skillCodes: ['knowledge-search'],
      },
    },
  },
  operator: {
    password: 'ant.design',
    currentAuthority: 'user',
    accessToken: 'mock-operator-access-token',
    defaultContextId: 'ctx-s1-g2',
    profile: {
      userid: '00000003',
      username: 'operator',
      name: 'Operator User',
      email: 'operator@example.com',
      title: 'Operator',
    },
    grants: {
      'ctx-s1-g2': {
        permissions: [
          'page:home',
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
};

// 选择默认系统属于服务端用户偏好；mock 以用户名为键模拟数据库持久化。
const defaultContextIds: Partial<Record<MockUsername, ContextId>> = {};

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

const getContexts = (username: MockUsername) => {
  const grants = mockAccounts[username].grants;
  return (Object.entries(grants) as [ContextId, MockGrant][]).map(
    ([contextId, grant]) => ({
      ...contextCatalog[contextId],
      permissions: [...grant.permissions],
      skillCodes: [...grant.skillCodes],
    }),
  );
};

// GET /api/currentUser 的 mock 数据由 Bearer token 对应账户和逐 Context 授权共同生成。
export const buildMockCurrentUser = (username: MockUsername) => {
  const account = mockAccounts[username];
  return {
    ...defaultUser,
    ...account.profile,
    access: account.currentAuthority,
    contexts: getContexts(username),
    defaultContextId:
      defaultContextIds[username] ?? account.defaultContextId,
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
  'PUT /api/users/me/default-entry': (req: Request, res: Response) => {
    const username = getAuthenticatedUsername(req);
    if (!username) {
      res.status(401).send({
        errorCode: '401',
        errorMessage: '请先登录！',
        success: false,
      });
      return;
    }
    const { entryId } = req.body;
    const context = getContexts(username).find((item) => item.id === entryId);
    if (!context) {
      res.status(400).send({
        errorCode: '400',
        errorMessage: '系统上下文不存在',
        success: false,
      });
      return;
    }
    defaultContextIds[username] = context.id;
    res.send({
      success: true,
      data: { defaultContextId: context.id },
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
    const { password, username, type } = req.body;
    await waitTime(2000);
    const account = mockAccounts[username as MockUsername];
    if (type !== 'mobile' && account && password === account.password) {
      res.send({
        status: 'ok',
        type,
        currentAuthority: account.currentAuthority,
        accessToken: account.accessToken,
        tokenType: 'Bearer',
        expiresIn: 900,
      });
      return;
    }
    if (type === 'mobile') {
      // 手机验证码表单暂时保留，后端验证码登录就绪前不签发管理员 token。
      res.send({
        status: 'error',
        type,
        currentAuthority: 'guest',
      });
      return;
    }

    res.send({
      status: 'error',
      type,
      currentAuthority: 'guest',
    });
  },
  'POST /api/login/outLogin': (_req: Request, res: Response) => {
    // Bearer-only mock 不维护服务端会话；前端退出时清除本地 token。
    res.send({ data: {}, success: true });
  },
  'POST /api/auth/refresh': (req: Request, res: Response) => {
    const username = getAuthenticatedUsername(req);
    if (!username) {
      res.status(401).send({
        errorCode: '401',
        errorMessage: '登录态已失效',
        success: false,
      });
      return;
    }
    const account = mockAccounts[username];
    res.send({
      accessToken: account.accessToken,
      expiresIn: 900,
      user: buildMockCurrentUser(username),
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
