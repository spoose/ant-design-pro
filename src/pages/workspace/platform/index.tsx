import { useLocation, useModel, useParams } from '@umijs/max';
import type { TableProps } from 'antd';
import { Table, Tag } from 'antd';
import { useMemo } from 'react';
import WorkspacePage from '@/components/WorkspacePage';
import { buildWorkspaceBreadcrumb } from '@/utils/menuData';
import {
  getPlatformAppPagePath,
  type PlatformPageKey,
} from '@/utils/workspaceRoutes';
import { getPlatformAccess } from '@/utils/workspaceRules';
import { WorkspaceHomeModules } from '../overview/WorkspaceHomeModules';
import OrganizationManagement from './organizations';
import { PlatformWelcomeAvatar } from './overview/PlatformWelcomeAvatar';
import {
  formatPlatformWelcomeDate,
  getPlatformWelcomeHeading,
} from './overview/welcome';
import UserManagement from './users';

export { formatPlatformWelcomeDate, getPlatformWelcomeHeading };

/** Platform 页面标题与说明，key 来源于 /workspace/platform/:platformPageKey。 */
const platformPageMeta: Record<
  PlatformPageKey,
  { title: string; description: string }
> = {
  overview: {
    title: '工作台',
    description: '',
  },
  organizations: {
    title: '组织管理',
    description: '统一查看和管理已接入的组织。',
  },
  users: {
    title: '用户管理',
    description: '查看平台人员及其跨组织管理范围。',
  },
  permissions: {
    title: '权限管理',
    description: '查看平台级角色与权限范围。',
  },
  logs: {
    title: '日志',
    description: '查看系统操作与访问日志。',
  },
  system: {
    title: '系统设置',
    description: '',
  },
};

/** 判断 URL 中的未知字符串是否为当前已实现的 Platform 页面。 */
const isPlatformPageKey = (
  value: string | undefined,
): value is PlatformPageKey => Boolean(value && value in platformPageMeta);

/** Project 权限表静态行；后续由角色与权限接口替换。 */
type PlatformPermissionRecord = {
  key: string;
  role: string;
  scope: string;
  capabilities: string;
};

const platformPermissionRows: PlatformPermissionRecord[] = [
  {
    key: 'super-admin',
    role: 'Super Admin',
    scope: '平台',
    capabilities: '组织、人员、权限、审计',
  },
  {
    key: 'organization-admin',
    role: 'Organization Admin',
    scope: '指定组织',
    capabilities: '成员、角色与组织设置',
  },
  {
    key: 'member',
    role: 'Member',
    scope: '授权组织',
    capabilities: '已授权页面与应用',
  },
];

const platformPermissionColumns: TableProps<PlatformPermissionRecord>['columns'] =
  [
    { title: '角色', dataIndex: 'role' },
    { title: '权限范围', dataIndex: 'scope', width: 180 },
    { title: '能力摘要', dataIndex: 'capabilities' },
    {
      title: '状态',
      key: 'status',
      width: 110,
      render: () => <Tag color="success">已启用</Tag>,
    },
  ];

/** Project 管理与 Organization 首页共用相同模块；管理能力只保留在侧栏页面。 */
export const PlatformOverview = ({
  appCodes,
}: {
  /** 来源于 currentUser.projectAppCodes，只包含当前 Project 的可用应用。 */
  appCodes: string[];
}) => (
  <div className="grid gap-5">
    <WorkspaceHomeModules
      appTitle="项目应用"
      emptyDescription="当前账号暂无项目应用，请联系项目管理员授权。"
      getAppPath={(appCode) => getPlatformAppPagePath(appCode, 'overview')}
      appCodes={appCodes}
    />
  </div>
);

/** 根据 platformPageKey 选择固定标签中的页面内容，不创建新的标签状态。 */
const PlatformPageContent = ({
  pageKey,
  projectAppCodes,
}: {
  pageKey: PlatformPageKey;
  /** 当前用户在 Project 公共区域内可使用的应用代码。 */
  projectAppCodes: string[];
}) => {
  if (pageKey === 'overview') {
    return <PlatformOverview appCodes={projectAppCodes} />;
  }

  if (pageKey === 'organizations') {
    return <OrganizationManagement />;
  }

  if (pageKey === 'users') {
    return <UserManagement />;
  }

  if (pageKey === 'logs') {
    return (
      <section className="grid min-h-64 place-items-center border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid max-w-md justify-items-center gap-3">
          <h2 className="m-0 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            日志页面待开发
          </h2>
          <p className="m-0 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            侧栏入口已接入；明细列表后续补齐。
          </p>
        </div>
      </section>
    );
  }

  if (pageKey === 'system') {
    return null;
  }

  return (
    <Table<PlatformPermissionRecord>
      columns={platformPermissionColumns}
      dataSource={platformPermissionRows}
      pagination={false}
      scroll={{ x: 680 }}
      size="middle"
    />
  );
};

/** 所有已认证用户共用的 Project 工作台；管理子页继续由路由守卫逐项授权。 */
const PlatformManagementPage = () => {
  const { pathname } = useLocation();
  const { initialState } = useModel('@@initialState');
  // platformPageKey 由 Umi Browser Router 从当前 URL 提供。
  const { platformPageKey } = useParams<{ platformPageKey?: string }>();
  const pageKey = isPlatformPageKey(platformPageKey)
    ? platformPageKey
    : 'overview';
  // 数据链路：POST /api/currentUser/get -> getPlatformAccess -> 当前 Project 的首页应用。
  const platformAccess = useMemo(
    () =>
      initialState?.currentUser
        ? getPlatformAccess(initialState.currentUser)
        : undefined,
    [initialState?.currentUser],
  );
  const projectAppCodes = platformAccess?.availableAppCodes ?? [];
  const pageMeta = platformPageMeta[pageKey];
  const currentUser = initialState?.currentUser;
  const pageHeading =
    pageKey === 'overview'
      ? getPlatformWelcomeHeading({
          isSuperAdmin: currentUser?.isSuperAdmin,
          userName: currentUser?.name,
        })
      : pageMeta;

  return (
    <WorkspacePage
      breadcrumb={buildWorkspaceBreadcrumb(currentUser, pathname, [
        pageMeta.title,
      ])}
      description={pageHeading.description || undefined}
      leading={
        pageKey === 'overview' && currentUser ? (
          <PlatformWelcomeAvatar
            avatar={currentUser.avatar}
            userName={currentUser.name}
          />
        ) : undefined
      }
      title={pageHeading.title}
      actions={
        pageKey === 'permissions' ? <Tag color="blue">静态演示</Tag> : undefined
      }
    >
      <PlatformPageContent
        pageKey={pageKey}
        projectAppCodes={projectAppCodes}
      />
    </WorkspacePage>
  );
};

export default PlatformManagementPage;
