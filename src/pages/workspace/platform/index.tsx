import { useModel, useParams } from '@umijs/max';
import type { TableProps } from 'antd';
import { Table, Tag } from 'antd';
import { useMemo } from 'react';
import WorkspacePage from '@/components/WorkspacePage';
import WorkspaceSkillList from '@/components/WorkspaceSkillList';
import type { OrganizationAccess } from '@/services/auth';
import {
  getOrganizationHomePath,
  getPlatformAppPagePath,
  type PlatformPageKey,
} from '@/utils/workspaceRoutes';
import { getPlatformAccess } from '@/utils/workspaceRules';

/** Platform 页面标题与说明，key 来源于 /workspace/platform/:platformPageKey。 */
const platformPageMeta: Record<
  PlatformPageKey,
  { title: string; description: string }
> = {
  overview: {
    title: '管理总览',
    description: '查看平台当前接入的组织、人员和授权概况。',
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

/** 组织管理表的一行；正式数据后续由 Platform Organization API 提供。 */
type PlatformOrganizationRecord = {
  /** React Table 稳定行键，来源于 organizationId。 */
  key: string;
  /** 组织短编码。 */
  code: string;
  /** 组织显示名称。 */
  name: string;
  /** 点击“进入组织”时进入的 Organization ID。 */
  organizationId: string;
};

/** 把 currentUser 中可进入的组织适配为静态演示表；不代表平台管理目录全集。 */
const buildOrganizationRows = (
  organizations: OrganizationAccess[],
): PlatformOrganizationRecord[] =>
  organizations.map((organization) => ({
    key: organization.organizationId,
    code: organization.organizationCode,
    name: organization.organizationName,
    organizationId: organization.organizationId,
  }));

const organizationColumns: TableProps<PlatformOrganizationRecord>['columns'] = [
  {
    title: '组织',
    dataIndex: 'name',
    render: (name: string, record) => (
      <div className="grid gap-0.5">
        <strong className="font-medium text-zinc-900 dark:text-zinc-100">
          {name}
        </strong>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {record.code}
        </span>
      </div>
    ),
  },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: () => <Tag color="success">已启用</Tag>,
  },
  {
    title: '操作',
    key: 'operation',
    width: 110,
    render: (_, record) => (
      <a href={getOrganizationHomePath(record.organizationId)}>进入组织</a>
    ),
  },
];

/** 人员表静态行；只用于确认平台标签内页面的密度和布局。 */
type PlatformUserRecord = {
  key: string;
  name: string;
  account: string;
  role: string;
  scope: string;
};

const platformUserRows: PlatformUserRecord[] = [
  {
    key: 'user-1',
    name: 'Admin User',
    account: 'admin@example.com',
    role: 'Super Admin',
    scope: '全部组织',
  },
  {
    key: 'user-2',
    name: 'Operator User',
    account: 'operator@example.com',
    role: 'Organization Admin',
    scope: '组织一',
  },
  {
    key: 'user-3',
    name: 'Standard User',
    account: 'user@example.com',
    role: 'Member',
    scope: '2 个组织',
  },
];

const platformUserColumns: TableProps<PlatformUserRecord>['columns'] = [
  {
    title: '人员',
    dataIndex: 'name',
    render: (name: string, record) => (
      <div className="grid gap-0.5">
        <strong className="font-medium text-zinc-900 dark:text-zinc-100">
          {name}
        </strong>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {record.account}
        </span>
      </div>
    ),
  },
  { title: '平台角色', dataIndex: 'role', width: 180 },
  { title: '管理范围', dataIndex: 'scope', width: 160 },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: () => <Tag color="success">正常</Tag>,
  },
];

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

/** 管理总览；指标来自当前登录用户可进入组织和静态演示数据。 */
const PlatformOverview = ({
  organizationRows,
  skillCodes,
}: {
  organizationRows: PlatformOrganizationRecord[];
  /** 来源于 currentUser.platformSkillCodes，只包含 Platform Scope 的可用 Skill。 */
  skillCodes: string[];
}) => (
  <div className="grid gap-4">
    <dl className="grid overflow-hidden border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-3">
      {[
        ['接入组织', organizationRows.length],
        ['平台人员', platformUserRows.length],
        ['角色模板', platformPermissionRows.length],
      ].map(([label, value]) => (
        <div
          className="border-b border-zinc-200 p-5 last:border-b-0 dark:border-zinc-800 sm:border-r sm:border-b-0 sm:last:border-r-0"
          key={label}
        >
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">{label}</dt>
          <dd className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            {value}
          </dd>
        </div>
      ))}
    </dl>
    <div className="overflow-hidden border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h2 className="m-0 text-base font-semibold text-zinc-950 dark:text-zinc-50">
          已接入组织
        </h2>
      </div>
      <Table<PlatformOrganizationRecord>
        columns={organizationColumns}
        dataSource={organizationRows}
        pagination={false}
        scroll={{ x: 680 }}
        size="middle"
      />
    </div>
    <WorkspaceSkillList
      emptyDescription="当前账号暂无平台应用，请联系平台管理员授权。"
      getSkillPath={(skillCode) =>
        getPlatformAppPagePath(skillCode, 'overview')
      }
      skillCodes={skillCodes}
      title="平台应用"
    />
  </div>
);

/** 根据 platformPageKey 选择固定标签中的页面内容，不创建新的标签状态。 */
const PlatformPageContent = ({
  pageKey,
  organizationRows,
  platformSkillCodes,
}: {
  pageKey: PlatformPageKey;
  organizationRows: PlatformOrganizationRecord[];
  /** 当前用户在 Platform Scope 内被后端授权的 Skill Code。 */
  platformSkillCodes: string[];
}) => {
  if (pageKey === 'overview') {
    return (
      <PlatformOverview
        organizationRows={organizationRows}
        skillCodes={platformSkillCodes}
      />
    );
  }

  if (pageKey === 'organizations') {
    return (
      <Table<PlatformOrganizationRecord>
        columns={organizationColumns}
        dataSource={organizationRows}
        pagination={false}
        scroll={{ x: 680 }}
        size="middle"
      />
    );
  }

  if (pageKey === 'users') {
    return (
      <Table<PlatformUserRecord>
        columns={platformUserColumns}
        dataSource={platformUserRows}
        pagination={false}
        scroll={{ x: 680 }}
        size="middle"
      />
    );
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
  // currentUser.organizations 仅用于演示；正式组织管理列表由 Platform API 提供。
  const organizations = initialState?.currentUser?.organizations ?? [];
  // 数据链路：GET /api/currentUser.platformSkillCodes -> getPlatformAccess
  // -> PlatformOverview -> WorkspaceSkillList -> Platform App URL/标签。
  const platformSkillCodes = initialState?.currentUser
    ? getPlatformAccess(initialState.currentUser).availableSkillCodes
    : [];
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
      actions={<Tag color="blue">静态演示</Tag>}
    >
      <PlatformPageContent
        pageKey={pageKey}
        organizationRows={organizationRows}
        platformSkillCodes={platformSkillCodes}
      />
    </WorkspacePage>
  );
};

export default PlatformManagementPage;
