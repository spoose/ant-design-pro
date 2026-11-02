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

describe('octop home sidebar entry', () => {
  it('uses one flat authorized entry and preserves the home sidebar', () => {
    const granted = {
      ...superAdmin,
      projectAppCodes: ['octop'],
      organizations: [{ ...superAdmin.organizations[0], appCodes: ['octop'] }],
    };
    for (const pathname of [
      '/workspace/platform/apps/octop/overview',
      '/workspace/org/organization-1/apps/octop/overview',
    ]) {
      const menu = resolveWorkspaceMenuDescriptor(granted, pathname);
      expect(menu?.kind).not.toBe('app');
      expect(menu?.items.find((item) => item.name === 'AI助手')).toMatchObject({
        path: pathname,
      });
      expect(
        menu?.items.find((item) => item.name === 'AI助手')?.children,
      ).toBeUndefined();
    }
    expect(
      createPlatformWorkspaceMenus(['overview'], []).some(
        (item) => item.name === 'AI助手',
      ),
    ).toBe(false);
    expect(
      createOrganizationWorkspaceMenus('organization-1', ['home'], []).some(
        (item) => item.name === 'AI助手',
      ),
    ).toBe(false);
  });
});

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
        name: '通知',
        path: '/workspace/org/organization%2Fa/notifications',
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
      { name: '通知', path: '/workspace/platform/notifications' },
      {
        name: '设置',
        path: '/workspace/platform/system',
        children: [
          { name: '组织管理', path: '/workspace/platform/organizations' },
          { name: '用户管理', path: '/workspace/platform/users' },
        ],
      },
    ]);
  });

  it('orders 用户管理 before 日志 under 设置', () => {
    expect(
      createPlatformWorkspaceMenus(['overview', 'users', 'logs']).flatMap(
        (item) =>
          item.name === '设置'
            ? (item.children?.map((child) => child.name) ?? [])
            : [],
      ),
    ).toEqual(['用户管理', '日志']);
  });

  it('places the knowledge assistant second and puts authorized legacy entries in more', () => {
    for (const [menus, root] of [
      [
        createPlatformWorkspaceMenus(
          ['overview'],
          ['octop', 'ai-assistant'],
          true,
        ),
        '/workspace/platform',
      ],
      [
        createOrganizationWorkspaceMenus(
          'organization-1',
          ['home'],
          ['octop', 'ai-assistant'],
          true,
        ),
        '/workspace/org/organization-1',
      ],
    ] as const) {
      expect(menus.slice(0, 3).map((item) => item.name)).toEqual([
        root.includes('/org/') ? '组织首页' : '工作台',
        'AI助手',
        '通知',
      ]);
      const more = menus.find((item) => item.key === 'workspace-more');
      expect(more?.children?.map((item: MenuDataItem) => item.name)).toEqual([
        '统计',
        'AI助手(Legacy)',
      ]);
      expect(
        more?.children?.[0].children?.map((item: MenuDataItem) => item.path),
      ).toEqual([
        `${root}/stats/users`,
        `${root}/stats/requests`,
        `${root}/stats/traces`,
      ]);
      expect(
        more?.children?.[1].children?.map((item: MenuDataItem) => item.path),
      ).toEqual([
        `${root}/apps/ai-assistant/overview`,
        `${root}/apps/ai-assistant/resources`,
        `${root}/apps/ai-assistant/memory`,
      ]);
    }
  });

  it('only shows more entries that are authorized', () => {
    const more = (apps: string[], stats: boolean) =>
      createPlatformWorkspaceMenus(['overview'], apps, stats).find(
        (item) => item.key === 'workspace-more',
      );
    expect(more([], false)).toBeUndefined();
    expect(
      more([], true)?.children?.map((item: MenuDataItem) => item.name),
    ).toEqual(['统计']);
    expect(
      more(['ai-assistant'], false)?.children?.map(
        (item: MenuDataItem) => item.name,
      ),
    ).toEqual(['AI助手(Legacy)']);
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
      [
        { name: '工作台', path: '/workspace/platform/overview' },
        { name: '通知', path: '/workspace/platform/notifications' },
      ],
    );
  });

  it('keeps the home sidebar on AI助手 URLs instead of swapping to an App sidebar', () => {
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
    const more = platformMenu?.items.find(
      (item) => item.key === 'workspace-more',
    );
    expect(more?.children?.map((item: MenuDataItem) => item.name)).toEqual([
      '统计',
      'AI助手(Legacy)',
    ]);
    expect(
      more?.children?.[1].children?.map((item: MenuDataItem) => item.name),
    ).toEqual(['AI助手', '资源', '记忆']);
    expect(
      platformMenu?.items
        .find((item) => item.name === '设置')
        ?.children?.map(({ name }) => name),
    ).toEqual(['组织管理', '用户管理', '日志']);

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
      '通知',
      '更多',
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
