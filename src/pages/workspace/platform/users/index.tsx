import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { App, Tag } from 'antd';
import { useCallback } from 'react';
import type { AdminUser, AdminUserStatus } from './data.d';
import { getAdminUserErrorDetails, listAdminUsers } from './service';

const USER_LIST_ERROR_NOTIFICATION_KEY = 'admin-user-list-error';

const statusValueEnum = {
  active: { text: '正常', status: 'Success' },
  disabled: { text: '已停用', status: 'Default' },
  deleted: { text: '已删除', status: 'Error' },
} as const;

const statusTags: Record<AdminUserStatus, React.ReactNode> = {
  active: <Tag color="success">正常</Tag>,
  disabled: <Tag>已停用</Tag>,
  deleted: <Tag color="error">已删除</Tag>,
};

const columns: ProColumns<AdminUser>[] = [
  {
    title: '关键词',
    dataIndex: 'keyword',
    hideInTable: true,
    fieldProps: {
      allowClear: true,
      placeholder: '姓名、用户名或邮箱',
    },
  },
  {
    title: '人员',
    dataIndex: 'name',
    search: false,
    render: (_, record) => (
      <div className="grid gap-0.5">
        <strong className="font-medium text-zinc-900 dark:text-zinc-100">
          {record.name}
        </strong>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          @{record.username}
        </span>
      </div>
    ),
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    search: false,
    copyable: true,
  },
  {
    title: '身份',
    dataIndex: 'isSuperAdmin',
    search: false,
    width: 140,
    render: (_, record) =>
      record.isSuperAdmin ? <Tag color="blue">Super Admin</Tag> : '普通用户',
  },
  {
    title: '状态',
    dataIndex: 'status',
    valueEnum: statusValueEnum,
    width: 120,
    render: (_, record) => statusTags[record.status],
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    valueType: 'dateTime',
    search: false,
    width: 190,
  },
];

const UserManagement = () => {
  const { notification } = App.useApp();

  const showRequestError = useCallback(
    (error: unknown) => {
      const details = getAdminUserErrorDetails(error);
      notification.error({
        key: USER_LIST_ERROR_NOTIFICATION_KEY,
        title: '加载人员列表失败',
        description: (
          <div>
            <div>{details.message}</div>
            {details.errorCode ? (
              <div>错误代码：{details.errorCode}</div>
            ) : null}
            {details.traceId ? <div>追踪编号：{details.traceId}</div> : null}
          </div>
        ),
        placement: 'topRight',
        duration: false,
        closable: true,
        role: 'alert',
      });
    },
    [notification],
  );

  return (
    <ProTable<AdminUser>
      columns={columns}
      rowKey="userId"
      search={{ labelWidth: 'auto' }}
      pagination={{ defaultPageSize: 20, showSizeChanger: true }}
      request={async (params) => {
        notification.destroy(USER_LIST_ERROR_NOTIFICATION_KEY);
        try {
          const response = await listAdminUsers(
            {
              page: params.current ?? 1,
              pageSize: params.pageSize ?? 20,
              ...(typeof params.keyword === 'string' && params.keyword.trim()
                ? { keyword: params.keyword.trim() }
                : {}),
              ...(params.status === 'active' ||
              params.status === 'disabled' ||
              params.status === 'deleted'
                ? { status: params.status }
                : {}),
              sortBy: 'createdAt',
              sortOrder: 'desc',
            },
            { skipErrorHandler: true },
          );
          return {
            data: response.data.list,
            success: true,
            total: response.data.total,
          };
        } catch (error) {
          showRequestError(error);
          throw error;
        }
      }}
      scroll={{ x: 860 }}
      size="middle"
    />
  );
};

export default UserManagement;
