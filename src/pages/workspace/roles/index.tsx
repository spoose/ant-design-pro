import { useModel, useParams } from '@umijs/max';
import type { TableProps } from 'antd';
import { Table, Tag } from 'antd';
import WorkspacePage from '@/components/WorkspacePage';

/** Organization 角色表静态行；后续由当前 organizationId 对应的角色接口替换。 */
type OrganizationRoleRecord = {
  /** React Table 稳定行键。 */
  key: string;
  /** 角色显示名称。 */
  name: string;
  /** 角色用途说明。 */
  description: string;
  /** 当前角色已绑定的成员数。 */
  memberCount: number;
  /** 当前角色的权限摘要。 */
  permissions: string;
};

const roleRows: OrganizationRoleRecord[] = [
  {
    key: 'organization-admin',
    name: 'Organization Admin',
    description: '管理当前组织的成员、角色与基础设置',
    memberCount: 2,
    permissions: '8 项权限',
  },
  {
    key: 'reviewer',
    name: 'Reviewer',
    description: '使用审核类应用并查看处理记录',
    memberCount: 4,
    permissions: '4 项权限',
  },
  {
    key: 'member',
    name: 'Member',
    description: '访问当前组织内已授权的页面和应用',
    memberCount: 12,
    permissions: '3 项权限',
  },
];

const roleColumns: TableProps<OrganizationRoleRecord>['columns'] = [
  {
    title: '角色',
    dataIndex: 'name',
    render: (name: string, record) => (
      <div className="grid gap-0.5">
        <strong className="font-medium text-zinc-900 dark:text-zinc-100">
          {name}
        </strong>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {record.description}
        </span>
      </div>
    ),
  },
  {
    title: '成员数',
    dataIndex: 'memberCount',
    width: 120,
    render: (count: number) => `${count} 人`,
  },
  { title: '权限', dataIndex: 'permissions', width: 140 },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: () => <Tag color="success">已启用</Tag>,
  },
];

/** 当前 Organization 首页标签内的角色管理页面。 */
const OrganizationRolesPage = () => {
  const { initialState } = useModel('@@initialState');
  const { organizationId } = useParams<{ organizationId?: string }>();
  const organization = initialState?.currentUser?.organizations.find(
    (item) => item.organizationId === organizationId,
  );

  return (
    <WorkspacePage
      breadcrumb={[organization?.organizationName ?? '当前组织', '角色管理']}
      title="角色管理"
      description="查看当前组织内的角色与权限摘要。"
      actions={<Tag color="blue">静态演示</Tag>}
    >
      <Table<OrganizationRoleRecord>
        columns={roleColumns}
        dataSource={roleRows}
        pagination={false}
        scroll={{ x: 760 }}
        size="middle"
      />
    </WorkspacePage>
  );
};

export default OrganizationRolesPage;
