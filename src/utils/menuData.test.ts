import type { MenuDataItem } from '@ant-design/pro-components';
import { describe, expect, it, vi } from 'vitest';
import type { AuthCurrentUser } from '@/services/auth';
import {
  buildWorkspaceBreadcrumb,
  createAppWorkspaceMenus,
  createOrganizationWorkspaceMenus,
  createPlatformWorkspaceMenus,
  groupTemplateExampleMenus,
  resolveWorkspaceMenuDescriptor,
} from './menuData';

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return { generatePath, matchPath };
});

const superAdmin = {
  userId: 'super-admin',
  username: 'super-admin',
  name: 'Super Admin',
  avatar: null,
  email: 'super-admin@example.test',
  status: 'active',
  isSuperAdmin: true,
  platformPermissions: ['platform:organization:update', 'platform:user:manage'],
  projectAppCodes: ['knowledge-search'],
  defaultOrganizationId: null,
  organizations: [
    {
      organizationId: 'organization-1',
      organizationCode: 'ORG1',
      organizationName: '组织一',
      permissions: ['organization:user:manage'],
      appCodes: ['file-review'],
      dataScopes: [],
      defaultDataScopeId: null,
    },
  ],
} as AuthCurrentUser;

describe('groupTemplateExampleMenus', () => {
  it('groups template pages without changing paths', () => {
    const menuData: MenuDataItem[] = [
      { path: '/home', name: 'Home' },
      { path: '/welcome', name: 'Welcome' },
      {
        path: '/form',
        name: 'Form',
        children: [
          { path: '/form/basic-form', name: 'Basic Form' },
          { path: '/form/step-form', name: 'Step Form' },
          { path: '/form/advanced-form', name: 'Advanced Form' },
        ],
      },
      { path: '/list', name: 'List' },
      { path: '/examples', name: 'Examples' },
    ];
    const result = groupTemplateExampleMenus(menuData);

    expect(result.map((item) => item.path)).toEqual([
      '/home',
      '/form',
      '/examples',
    ]);
    expect(
      result
        .find((item) => item.path === '/examples')
        ?.children?.map((item) => item.path),
    ).toEqual(['/welcome', '/form/step-form', '/form/advanced-form', '/list']);
  });
});

describe('Workspace menus', () => {
  it('builds filtered Organization and Platform home menus', () => {
    expect(
      createOrganizationWorkspaceMenus('organization/a', [
        'home',
        'members',
      ]).map(({ name, path }) => ({ name, path })),
    ).toEqual([
      {
        name: '组织首页',
        path: '/workspace/org/organization%2Fa/home',
      },
      {
        name: '组织设置',
        path: '/workspace/org/organization%2Fa/settings',
      },
    ]);
    expect(
      createPlatformWorkspaceMenus(['overview', 'organizations', 'users']).map(
        ({ name, path, children }) => ({
          name,
          path,
          ...(children
            ? {
                children: children.map((child) => ({
                  name: child.name,
                  path: child.path,
                })),
              }
            : {}),
        }),
      ),
    ).toEqual([
      { name: '工作台', path: '/workspace/platform/overview' },
      {
        name: '系统设置',
        path: '/workspace/platform/system',
        children: [
          { name: '组织管理', path: '/workspace/platform/organizations' },
          { name: '用户管理', path: '/workspace/platform/users' },
        ],
      },
    ]);
  });

  it('orders 用户管理 before 日志 under 系统设置', () => {
    expect(
      createPlatformWorkspaceMenus(['overview', 'users', 'logs']).flatMap(
        (item) =>
          item.name === '系统设置'
            ? (item.children?.map((child) => child.name) ?? [])
            : [],
      ),
    ).toEqual(['用户管理', '日志']);
  });

  it('nests xOneAI under Organization and Platform home menus when authorized', () => {
    const serializeMenus = (items: MenuDataItem[]) =>
      items.map(({ name, path, children }) => ({
        name,
        path,
        ...(children
          ? {
              children: children.map((child) => ({
                name: child.name,
                path: child.path,
              })),
            }
          : {}),
      }));

    expect(
      serializeMenus(
        createOrganizationWorkspaceMenus(
          'organization-1',
          ['home', 'members'],
          ['ai-assistant'],
        ),
      ),
    ).toEqual([
      {
        name: '组织首页',
        path: '/workspace/org/organization-1/home',
      },
      {
        name: 'xOneAI',
        path: '/workspace/org/organization-1/apps/ai-assistant',
        children: [
          {
            name: 'AI助手',
            path: '/workspace/org/organization-1/apps/ai-assistant/overview',
          },
          {
            name: '资源',
            path: '/workspace/org/organization-1/apps/ai-assistant/resources',
          },
          {
            name: '记忆',
            path: '/workspace/org/organization-1/apps/ai-assistant/memory',
          },
        ],
      },
      {
        name: '组织设置',
        path: '/workspace/org/organization-1/settings',
        children: [
          {
            name: '用户管理',
            path: '/workspace/org/organization-1/members',
          },
        ],
      },
    ]);

    expect(
      serializeMenus(
        createPlatformWorkspaceMenus(
          ['overview', 'organizations'],
          ['ai-assistant'],
        ),
      ),
    ).toEqual([
      { name: '工作台', path: '/workspace/platform/overview' },
      {
        name: 'xOneAI',
        path: '/workspace/platform/apps/ai-assistant',
        children: [
          {
            name: 'AI助手',
            path: '/workspace/platform/apps/ai-assistant/overview',
          },
          {
            name: '资源',
            path: '/workspace/platform/apps/ai-assistant/resources',
          },
          {
            name: '记忆',
            path: '/workspace/platform/apps/ai-assistant/memory',
          },
        ],
      },
      {
        name: '系统设置',
        path: '/workspace/platform/system',
        children: [
          { name: '组织管理', path: '/workspace/platform/organizations' },
        ],
      },
    ]);

    const paiMenu = createPlatformWorkspaceMenus(
      ['overview'],
      ['ai-assistant'],
    ).find((item) => item.name === 'xOneAI');
    expect(paiMenu?.path).toBe('/workspace/platform/apps/ai-assistant');
    expect(paiMenu?.key).toBe('/workspace/platform/apps/ai-assistant');
    expect(paiMenu?.children?.map((child) => child.path)).toEqual([
      '/workspace/platform/apps/ai-assistant/overview',
      '/workspace/platform/apps/ai-assistant/resources',
      '/workspace/platform/apps/ai-assistant/memory',
    ]);
    expect(paiMenu?.children?.map((child) => child.path)).not.toContain(
      paiMenu?.path,
    );
  });

  it('nests stats after xOneAI for administrators only', () => {
    const serialize = (
      items: ReturnType<typeof createPlatformWorkspaceMenus>,
    ) =>
      items.map(({ name, path, children }) => ({
        name,
        path,
        ...(children
          ? {
              children: children.map((child) => ({
                name: child.name,
                path: child.path,
              })),
            }
          : {}),
      }));

    expect(
      serialize(
        createPlatformWorkspaceMenus(['overview', 'organizations'], [], true),
      ),
    ).toEqual([
      { name: '工作台', path: '/workspace/platform/overview' },
      {
        name: '统计',
        path: '/workspace/platform/stats',
        children: [
          { name: '用户规模', path: '/workspace/platform/stats/users' },
          { name: '请求用量', path: '/workspace/platform/stats/requests' },
          { name: '操作痕迹', path: '/workspace/platform/stats/traces' },
        ],
      },
      {
        name: '系统设置',
        path: '/workspace/platform/system',
        children: [
          { name: '组织管理', path: '/workspace/platform/organizations' },
        ],
      },
    ]);

    expect(
      createOrganizationWorkspaceMenus(
        'organization-1',
        ['home', 'members'],
        [],
        false,
      ).map(({ name }) => name),
    ).toEqual(['组织首页', '组织设置']);
  });

  it('derives Platform, Organization and App sidebars from the URL', () => {
    expect(
      resolveWorkspaceMenuDescriptor(
        superAdmin,
        '/workspace/platform/organizations',
      ),
    ).toMatchObject({ kind: 'platform', badge: 'PM', title: '项目控制台' });
    expect(
      resolveWorkspaceMenuDescriptor(
        superAdmin,
        '/workspace/org/organization-1/home',
      ),
    ).toMatchObject({
      kind: 'organization',
      badge: 'OR',
      title: '组织一',
    });
    expect(
      resolveWorkspaceMenuDescriptor(
        superAdmin,
        '/workspace/org/organization-1/apps/file-review',
      ),
    ).toMatchObject({
      kind: 'app',
      badge: 'OR',
      title: '文件审查',
    });
  });

  it('keeps the Project home menu for users without management grants', () => {
    const regularUser = {
      ...superAdmin,
      isSuperAdmin: false,
      platformPermissions: [],
      projectAppCodes: [],
    } as AuthCurrentUser;

    const descriptor = resolveWorkspaceMenuDescriptor(
      regularUser,
      '/workspace/platform/overview',
    );
    expect(descriptor).toMatchObject({
      kind: 'platform',
      badge: 'PJ',
      title: '工作台',
    });
    expect(descriptor?.items.map(({ name, path }) => ({ name, path }))).toEqual(
      [{ name: '工作台', path: '/workspace/platform/overview' }],
    );
  });

  it('keeps the home sidebar on xOneAI URLs instead of swapping to an App sidebar', () => {
    const userWithPai = {
      ...superAdmin,
      projectAppCodes: ['ai-assistant', 'knowledge-search'],
      organizations: superAdmin.organizations.map((organization) => ({
        ...organization,
        appCodes: ['ai-assistant', 'file-review'],
      })),
    } as AuthCurrentUser;

    const platformMenu = resolveWorkspaceMenuDescriptor(
      userWithPai,
      '/workspace/platform/apps/ai-assistant/resources',
    );
    expect(platformMenu).toMatchObject({
      kind: 'platform',
      title: '项目控制台',
    });
    expect(
      platformMenu?.items.map(({ name, path }) => ({ name, path })),
    ).toEqual([
      { name: '工作台', path: '/workspace/platform/overview' },
      {
        name: 'xOneAI',
        path: '/workspace/platform/apps/ai-assistant',
      },
      {
        name: '统计',
        path: '/workspace/platform/stats',
      },
      {
        name: '系统设置',
        path: '/workspace/platform/system',
      },
    ]);
    expect(
      platformMenu?.items
        .find((item) => item.name === 'xOneAI')
        ?.children?.map(({ name }) => name),
    ).toEqual(['AI助手', '资源', '记忆']);
    expect(
      platformMenu?.items
        .find((item) => item.name === '系统设置')
        ?.children?.map(({ name, path }) => ({ name, path })),
    ).toEqual([
      { name: '组织管理', path: '/workspace/platform/organizations' },
      { name: '用户管理', path: '/workspace/platform/users' },
      { name: '日志', path: '/workspace/platform/logs' },
    ]);

    const organizationMenu = resolveWorkspaceMenuDescriptor(
      userWithPai,
      '/workspace/org/organization-1/apps/ai-assistant/overview',
    );
    expect(organizationMenu).toMatchObject({
      kind: 'organization',
      title: '组织一',
    });
    expect(organizationMenu?.items.map(({ name }) => name)).toEqual([
      '组织首页',
      'xOneAI',
      '统计',
      '组织设置',
    ]);
  });

  it('builds App menus inside one App route namespace', () => {
    expect(
      createAppWorkspaceMenus(
        '/workspace/org/organization-1/apps/file-review/history',
        'file-review',
      ).map(({ name, path }) => ({ name, path })),
    ).toEqual([
      {
        name: '审查工作台',
        path: '/workspace/org/organization-1/apps/file-review/overview',
      },
      {
        name: '待审文件',
        path: '/workspace/org/organization-1/apps/file-review/queue',
      },
      {
        name: '审查记录',
        path: '/workspace/org/organization-1/apps/file-review/history',
      },
    ]);

    expect(
      createAppWorkspaceMenus(
        '/workspace/platform/apps/knowledge-search',
        'knowledge-search',
      ).map(({ name, path }) => ({ name, path })),
    ).toEqual([
      {
        name: '搜索工作台',
        path: '/workspace/platform/apps/knowledge-search/overview',
      },
      {
        name: '知识库',
        path: '/workspace/platform/apps/knowledge-search/sources',
      },
      {
        name: '搜索记录',
        path: '/workspace/platform/apps/knowledge-search/history',
      },
    ]);

    expect(
      createAppWorkspaceMenus(
        '/workspace/platform/apps/ai-assistant/overview',
        'ai-assistant',
      ).map(({ name, path }) => ({ name, path })),
    ).toEqual([
      {
        name: 'AI助手',
        path: '/workspace/platform/apps/ai-assistant/overview',
      },
      {
        name: '资源',
        path: '/workspace/platform/apps/ai-assistant/resources',
      },
      {
        name: '记忆',
        path: '/workspace/platform/apps/ai-assistant/memory',
      },
    ]);
  });
});

describe('buildWorkspaceBreadcrumb', () => {
  it('uses 项目控制台 on Project Admin paths and the organization name on Organization paths', () => {
    expect(
      buildWorkspaceBreadcrumb(superAdmin, '/workspace/platform/overview', [
        '工作台',
      ]),
    ).toEqual(['项目控制台', '工作台']);
    expect(
      buildWorkspaceBreadcrumb(
        superAdmin,
        '/workspace/org/organization-1/home',
        ['组织首页'],
      ),
    ).toEqual(['组织一', '组织首页']);
    expect(
      buildWorkspaceBreadcrumb(
        superAdmin,
        '/workspace/platform/apps/file-review/overview',
        ['文件审查', '审查工作台'],
      ),
    ).toEqual(['项目控制台', '文件审查', '审查工作台']);
  });
});
