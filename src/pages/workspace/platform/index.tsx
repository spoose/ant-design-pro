import { BankOutlined, RightOutlined } from '@ant-design/icons';
import { Link, useModel, useParams } from '@umijs/max';
import type { TableProps } from 'antd';
import { Table, Tag } from 'antd';
import { useMemo } from 'react';
import WorkspacePage from '@/components/WorkspacePage';
import WorkspaceSkillList from '@/components/WorkspaceSkillList';
import type { OrganizationAccess } from '@/services/auth';
import { workspaceIconColorVariables } from '@/theme/colors';
import { statusColors } from '@/theme/statusColors';
import {
  getOrganizationHomePath,
  getPlatformAppPagePath,
  type PlatformPageKey,
} from '@/utils/workspaceRoutes';
import { getPlatformAccess } from '@/utils/workspaceRules';
import OrganizationManagement from './organizations';
import UserManagement from './users';

/** Platform 页面标题与说明，key 来源于 /workspace/platform/:platformPageKey。 */
const platformPageMeta: Record<
  PlatformPageKey,
  { title: string; description: string }
> = {
  overview: {
    title: '管理总览',
    description: '总览所组织、应用和权限',
  },
  organizations: {
    title: '组织管理',
    description: '统一查看和管理已接入的组织。',
  },
  users: {
    title: '人员管理',
    description: '查看平台人员及其跨组织管理范围。',
  },
  permissions: {
    title: '权限管理',
    description: '查看平台级角色与权限范围。',
  },
};

/** 判断 URL 中的未知字符串是否为当前已实现的 Platform 页面。 */
const isPlatformPageKey = (
  value: string | undefined,
): value is PlatformPageKey => Boolean(value && value in platformPageMeta);

/** 当前账号可进入的组织项，不代表平台组织目录全集。 */
type PlatformOrganizationRecord = {
  /** 列表稳定键，来源于 organizationId。 */
  key: string;
  /** 组织短编码。 */
  code: string;
  /** 组织显示名称。 */
  name: string;
  /** 点击进入时使用的 Organization ID。 */
  organizationId: string;
};

/** 把 currentUser 中可进入的组织适配为总览列表；不代表平台管理目录全集。 */
const buildOrganizationRows = (
  organizations: OrganizationAccess[],
): PlatformOrganizationRecord[] =>
  organizations.map((organization) => ({
    key: organization.organizationId,
    code: organization.organizationCode,
    name: organization.organizationName,
    organizationId: organization.organizationId,
  }));

/** 平台权限表静态行；后续由角色与权限接口替换。 */
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

/** 平台权限 Widget：直接展示 currentUser 返回的真实权限码。 */
const PlatformPermissionWidget = ({
  permissions,
}: {
  permissions: string[];
}) => (
  <section
    aria-labelledby="platform-permissions-title"
    className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
  >
    <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
      <h2
        className="m-0 text-base font-semibold text-zinc-950 dark:text-zinc-50"
        id="platform-permissions-title"
      >
        平台权限
      </h2>
      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
        {permissions.length} 项
      </span>
    </header>

    {permissions.length ? (
      <ul className="m-0 list-none divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
        {permissions.map((permission) => (
          <li className="flex items-center gap-3 px-5 py-3" key={permission}>
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: statusColors.success.ink }}
            />
            <code className="min-w-0 [overflow-wrap:anywhere] text-xs leading-5 text-zinc-700 dark:text-zinc-300">
              {permission}
            </code>
          </li>
        ))}
      </ul>
    ) : (
      <p className="m-0 px-5 py-8 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        当前账号暂无平台权限。
      </p>
    )}
  </section>
);

/** 管理总览：平台应用横排启动卡在上；组织与权限宽屏双栏，窄屏单列。 */
export const PlatformOverview = ({
  organizationRows,
  skillCodes,
  permissions,
}: {
  organizationRows: PlatformOrganizationRecord[];
  /** 来源于 currentUser.platformSkillCodes，只包含 Platform Scope 的可用 Skill。 */
  skillCodes: string[];
  /** 来源于 currentUser.platformPermissions，不包含 Organization 权限。 */
  permissions: string[];
}) => (
  <div className="grid gap-5">
    <WorkspaceSkillList
      emptyDescription="当前账号暂无平台应用，请联系平台管理员授权。"
      getSkillPath={(skillCode) =>
        getPlatformAppPagePath(skillCode, 'overview')
      }
      skillCodes={skillCodes}
      title="平台应用"
    />

    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
      <section
        aria-labelledby="organization-workspace-title"
        className="min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      >
        <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2
            className="m-0 text-base font-semibold text-zinc-950 dark:text-zinc-50"
            id="organization-workspace-title"
          >
            组织工作区
          </h2>
          <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
            {organizationRows.length} 个
          </span>
        </header>

        {organizationRows.length ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {organizationRows.map((organization) => (
              <Link
                aria-label={`进入 ${organization.name}`}
                className="group flex min-h-16 items-center gap-3 px-5 py-3 text-inherit transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-orange-500 active:bg-zinc-100 motion-reduce:transition-none dark:hover:bg-zinc-800/70 dark:active:bg-zinc-800"
                key={organization.key}
                to={getOrganizationHomePath(organization.organizationId)}
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--workspace-icon-background)] text-[var(--workspace-icon-foreground)] dark:bg-[var(--workspace-icon-background-dark)] dark:text-[var(--workspace-icon-foreground-dark)]"
                  style={workspaceIconColorVariables}
                >
                  <BankOutlined className="text-base" />
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <strong className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {organization.name}
                  </strong>
                  <code className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {organization.code}
                  </code>
                </span>
                <RightOutlined
                  aria-hidden
                  className="shrink-0 text-xs text-zinc-400 transition-colors group-hover:text-orange-600 motion-reduce:transition-none dark:text-zinc-500 dark:group-hover:text-orange-400"
                />
              </Link>
            ))}
          </div>
        ) : (
          <p className="m-0 px-5 py-8 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            当前账号暂无可进入组织
          </p>
        )}
      </section>

      <PlatformPermissionWidget permissions={permissions} />
    </div>
  </div>
);

/** 根据 platformPageKey 选择固定标签中的页面内容，不创建新的标签状态。 */
const PlatformPageContent = ({
  pageKey,
  organizationRows,
  platformSkillCodes,
  platformPermissions,
}: {
  pageKey: PlatformPageKey;
  organizationRows: PlatformOrganizationRecord[];
  /** 当前用户在 Platform Scope 内被后端授权的 Skill Code。 */
  platformSkillCodes: string[];
  /** 当前用户在 Platform Scope 内被后端授权的权限码。 */
  platformPermissions: string[];
}) => {
  if (pageKey === 'overview') {
    return (
      <PlatformOverview
        organizationRows={organizationRows}
        permissions={platformPermissions}
        skillCodes={platformSkillCodes}
      />
    );
  }

  if (pageKey === 'organizations') {
    return <OrganizationManagement />;
  }

  if (pageKey === 'users') {
    return <UserManagement />;
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

/** Super Admin 固定“管理中心”标签的路由页面。 */
const PlatformManagementPage = () => {
  const { initialState } = useModel('@@initialState');
  // platformPageKey 由 Umi Browser Router 从当前 URL 提供。
  const { platformPageKey } = useParams<{ platformPageKey?: string }>();
  const pageKey = isPlatformPageKey(platformPageKey)
    ? platformPageKey
    : 'overview';
  // currentUser.organizations 仅表示可进入范围；组织管理全集由 /api/admin/organizations 提供。
  const organizations = initialState?.currentUser?.organizations ?? [];
  // 数据链路：GET /api/currentUser -> getPlatformAccess -> 管理总览的应用和权限 Widget。
  const platformAccess = useMemo(
    () =>
      initialState?.currentUser
        ? getPlatformAccess(initialState.currentUser)
        : undefined,
    [initialState?.currentUser],
  );
  const platformSkillCodes = platformAccess?.availableSkillCodes ?? [];
  const platformPermissions = platformAccess?.permissions ?? [];
  const organizationRows = useMemo(
    () => buildOrganizationRows(organizations),
    [organizations],
  );
  const pageMeta = platformPageMeta[pageKey];

  return (
    <WorkspacePage
      breadcrumb={['管理中心', pageMeta.title]}
      title={pageMeta.title}
      description={pageMeta.description}
      actions={
        pageKey === 'permissions' ? <Tag color="blue">静态演示</Tag> : undefined
      }
    >
      <PlatformPageContent
        pageKey={pageKey}
        organizationRows={organizationRows}
        platformPermissions={platformPermissions}
        platformSkillCodes={platformSkillCodes}
      />
    </WorkspacePage>
  );
};

export default PlatformManagementPage;
