import type { MenuDataItem } from '@ant-design/pro-components';
import { describe, expect, it, vi } from 'vitest';
import type { AuthCurrentUser } from '@/services/auth';
import {
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
  platformPermissions: ['platform:organization:update', 'platform:user:manage'],
  platformSkillCodes: ['knowledge-search'],
  organizations: [
    {
      organizationId: 'organization-1',
      organizationCode: 'ORG1',
      organizationName: '组织一',
      permissions: ['organization:user:manage'],
      skillCodes: ['file-review'],
      dataScopes: [],
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
        name: '成员管理',
        path: '/workspace/org/organization%2Fa/members',
      },
    ]);
    expect(
      createPlatformWorkspaceMenus(['overview', 'organizations', 'users']).map(
        ({ name, path }) => ({ name, path }),
      ),
    ).toEqual([
      { name: '管理总览', path: '/workspace/platform/overview' },
      { name: '组织管理', path: '/workspace/platform/organizations' },
      { name: '人员管理', path: '/workspace/platform/users' },
    ]);
  });

  it('derives Platform, Organization and App sidebars from the URL', () => {
    expect(
      resolveWorkspaceMenuDescriptor(
        superAdmin,
        '/workspace/platform/organizations',
      ),
    ).toMatchObject({ kind: 'platform', title: '管理中心' });
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

  it('builds Skill menus inside one App route namespace', () => {
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
  });
});
