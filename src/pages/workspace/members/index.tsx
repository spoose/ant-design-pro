import { useLocation, useModel } from '@umijs/max';
import type { TableProps } from 'antd';
import { Table, Tag } from 'antd';
import WorkspacePage from '@/components/WorkspacePage';
import { buildWorkspaceBreadcrumb } from '@/utils/menuData';

/** Organization 成员表静态行；后续由当前 organizationId 对应的成员接口替换。 */
type OrganizationMemberRecord = {
  /** React Table 稳定行键。 */
  key: string;
  /** 成员显示名称。 */
  name: string;
  /** 登录账号或联系邮箱。 */
  account: string;
  /** 成员在当前 Organization 中的角色。 */
  role: string;
  /** 成员所属部门或业务范围。 */
  scope: string;
};

const memberRows: OrganizationMemberRecord[] = [
  {
    key: 'member-1',
    name: 'Operator User',
    account: 'operator@example.com',
    role: 'Organization Admin',
    scope: '运营组',
  },
  {
    key: 'member-2',
    name: 'Standard User',
    account: 'user@example.com',
    role: 'Member',
    scope: '业务组',
  },
  {
    key: 'member-3',
    name: 'Review User',
    account: 'review@example.com',
    role: 'Reviewer',
    scope: '审核组',
  },
];

const memberColumns: TableProps<OrganizationMemberRecord>['columns'] = [
  {
    title: '成员',
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
  { title: '组织角色', dataIndex: 'role', width: 180 },
  { title: '所属范围', dataIndex: 'scope', width: 160 },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: () => <Tag color="success">正常</Tag>,
  },
];

/** 当前 Organization 首页标签内“组织设置-用户管理”页面。 */
const OrganizationMembersPage = () => {
  const { pathname } = useLocation();
  const { initialState } = useModel('@@initialState');

  return (
    <WorkspacePage
      breadcrumb={buildWorkspaceBreadcrumb(
        initialState?.currentUser,
        pathname,
        ['用户管理'],
      )}
      title="用户管理"
      description="管理当前组织内的成员及其组织角色。"
      actions={<Tag color="blue">静态演示</Tag>}
    >
      <Table<OrganizationMemberRecord>
        columns={memberColumns}
        dataSource={memberRows}
        pagination={false}
        scroll={{ x: 680 }}
        size="middle"
      />
    </WorkspacePage>
  );
};

export default OrganizationMembersPage;
