import { CheckOutlined, EditOutlined, StopOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ModalForm, ProFormSelect, ProTable } from '@ant-design/pro-components';
import { App, Popconfirm, Space, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useCallback, useRef, useState } from 'react';
import { listOrganizations } from '@/services/jushu-api/platformOrganizations';
import {
  listAdminUsers,
  setAdminUserOrganizations,
  setAdminUserStatus,
} from '@/services/jushu-api/platformUsers';
import { radii } from '@/theme/radius';
import {
  actionColors,
  actionPillClassName,
  identityColors,
  pillClassName,
  statusColors,
  statusPillClassName,
} from '@/theme/statusColors';
import { getAdminUserErrorDetails } from './service';

type AssignOrganizationFormValues = {
  organizationIds: string[];
};

const USER_ERROR_NOTIFICATION_KEY = 'admin-user-management-error';

const useStyles = createStyles(({ css }) => ({
  actionIconButton: css`
    margin: 0;
    box-sizing: border-box;
    display: inline-flex;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
    appearance: none;
    color: #000000a6;
    background: #ffffff;
    border: 1px solid #d9d9d9;
    border-radius: ${radii.sm}px;
    transition:
      color 150ms ease,
      border-color 150ms ease;

    &:hover {
      color: #000000e0;
      border-color: #00000040;
    }

    &:focus-visible {
      outline: 2px solid #a1a1aa;
      outline-offset: 2px;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `,
}));

const statusValueEnum = {
  active: { text: '正常', status: 'Success' },
  disabled: { text: '已停用', status: 'Default' },
  deleted: { text: '已删除', status: 'Error' },
} as const;

const UserStatusPill = ({ status }: { status: JushuAPI.UserStatus }) => {
  const semantic =
    status === 'active'
      ? 'success'
      : status === 'disabled'
        ? 'warning'
        : 'error';
  const colors = statusColors[semantic];
  const label =
    status === 'active' ? '正常' : status === 'disabled' ? '已停用' : '已删除';
  return (
    <span
      className={statusPillClassName[semantic]}
      style={{ backgroundColor: colors.soft, color: colors.ink }}
    >
      {label}
    </span>
  );
};

const PendingOrganizationPill = () => (
  <span
    className={statusPillClassName.warning}
    style={{
      backgroundColor: statusColors.warning.soft,
      color: statusColors.warning.ink,
    }}
  >
    待分配
  </span>
);

const UserIdentityPill = ({ isSuperAdmin }: { isSuperAdmin: boolean }) => {
  const colors = isSuperAdmin ? identityColors.admin : identityColors.member;
  return (
    <span
      className={pillClassName}
      style={{ backgroundColor: colors.soft, color: colors.ink }}
    >
      {isSuperAdmin ? '超级管理员' : '普通用户'}
    </span>
  );
};

const UserManagement = () => {
  const { styles } = useStyles();
  const { message, notification } = App.useApp();
  const actionRef = useRef<ActionType | null>(null);
  const [editingUser, setEditingUser] = useState<JushuAPI.AdminUser>();
  const [organizations, setOrganizations] = useState<
    JushuAPI.AdminUserOrganization[]
  >([]);

  const showRequestError = useCallback(
    (title: string, error: unknown) => {
      const details = getAdminUserErrorDetails(error);
      notification.error({
        key: USER_ERROR_NOTIFICATION_KEY,
        title,
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

  const openAssignForm = async (user: JushuAPI.AdminUser) => {
    try {
      if (organizations.length === 0) {
        const response = await listOrganizations({ skipErrorHandler: true });
        setOrganizations(
          response.data
            .filter((organization) => organization.status === 'active')
            .map(({ organizationId, organizationCode, organizationName }) => ({
              organizationId,
              organizationCode,
              organizationName,
            })),
        );
      }
      setEditingUser(user);
    } catch (error) {
      showRequestError('加载可分配组织失败', error);
    }
  };

  const handleStatusChange = async (
    user: JushuAPI.AdminUser,
    status: 'active' | 'disabled',
  ) => {
    try {
      await setAdminUserStatus(
        { userId: user.userId, status },
        { skipErrorHandler: true },
      );
      message.success(
        `已${status === 'active' ? '恢复' : '停用'}“${user.name}”`,
      );
      actionRef.current?.reload();
    } catch (error) {
      showRequestError(
        status === 'active' ? '恢复用户失败' : '停用用户失败',
        error,
      );
    }
  };

  const columns: ProColumns<JushuAPI.AdminUser>[] = [
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
        <div className="grid gap-0.5 whitespace-nowrap">
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
      title: '所属组织',
      dataIndex: 'organizations',
      search: false,
      render: (_, record) =>
        record.organizations.length === 0 ? (
          <PendingOrganizationPill />
        ) : (
          <Space size={[4, 4]} wrap>
            {record.organizations.map((organization) => (
              <span
                key={organization.organizationId}
                className={actionPillClassName}
                style={{
                  backgroundColor: actionColors.soft,
                  color: actionColors.ink,
                }}
                title={organization.organizationCode}
              >
                {organization.organizationName}
              </span>
            ))}
          </Space>
        ),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 104,
      render: (_, record) => {
        if (record.status === 'deleted') return null;
        const organizationLabel =
          record.organizations.length === 0 ? '分配组织' : '调整组织';
        return (
          <Space size={8}>
            <Tooltip title={organizationLabel}>
              <button
                aria-label={organizationLabel}
                className={styles.actionIconButton}
                onClick={() => void openAssignForm(record)}
                type="button"
              >
                <EditOutlined aria-hidden />
              </button>
            </Tooltip>
            {record.status === 'disabled' ? (
              <Tooltip title="恢复用户">
                <button
                  aria-label="恢复用户"
                  className={styles.actionIconButton}
                  onClick={() => void handleStatusChange(record, 'active')}
                  type="button"
                >
                  <CheckOutlined aria-hidden />
                </button>
              </Tooltip>
            ) : (
              <Tooltip title="停用用户">
                <Popconfirm
                  title="停用用户"
                  description={`确定停用“${record.name}”吗？`}
                  okText="停用"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleStatusChange(record, 'disabled')}
                >
                  <button
                    aria-label="停用用户"
                    className={styles.actionIconButton}
                    type="button"
                  >
                    <StopOutlined aria-hidden />
                  </button>
                </Popconfirm>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: '身份',
      dataIndex: 'isSuperAdmin',
      search: false,
      render: (_, record) => (
        <UserIdentityPill isSuperAdmin={record.isSuperAdmin} />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: statusValueEnum,
      render: (_, record) => <UserStatusPill status={record.status} />,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
      width: 190,
    },
  ];

  const handleSubmit = async (values: AssignOrganizationFormValues) => {
    if (!editingUser) return false;
    try {
      await setAdminUserOrganizations(
        {
          userId: editingUser.userId,
          organizationIds: values.organizationIds,
        },
        { skipErrorHandler: true },
      );
      message.success(`已为“${editingUser.name}”更新组织归属`);
      actionRef.current?.reload();
      return true;
    } catch (error) {
      showRequestError('更新组织归属失败', error);
      return false;
    }
  };

  return (
    <>
      <ProTable<JushuAPI.AdminUser>
        actionRef={actionRef}
        columns={columns}
        rowKey="userId"
        search={{ labelWidth: 'auto' }}
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        request={async (params) => {
          notification.destroy(USER_ERROR_NOTIFICATION_KEY);
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
            showRequestError('加载人员列表失败', error);
            throw error;
          }
        }}
        scroll={{ x: 860 }}
        size="middle"
      />

      <ModalForm<AssignOrganizationFormValues>
        key={editingUser?.userId ?? 'assign'}
        open={Boolean(editingUser)}
        title={`${editingUser?.organizations.length ? '调整' : '分配'}组织 · ${editingUser?.name ?? ''}`}
        width={520}
        initialValues={{
          organizationIds: editingUser?.organizations.map(
            (organization) => organization.organizationId,
          ),
        }}
        modalProps={{
          destroyOnHidden: true,
          okText: '保存',
          cancelText: '取消',
        }}
        onOpenChange={(open) => {
          if (!open) setEditingUser(undefined);
        }}
        onFinish={handleSubmit}
      >
        <ProFormSelect
          name="organizationIds"
          label="所属组织"
          mode="multiple"
          options={organizations.map((organization) => ({
            label: `${organization.organizationName}（${organization.organizationCode}）`,
            value: organization.organizationId,
          }))}
          fieldProps={{
            showSearch: true,
            optionFilterProp: 'label',
            placeholder: '选择一个或多个组织',
          }}
          rules={[{ required: true, message: '请至少选择一个组织' }]}
        />
      </ModalForm>
    </>
  );
};

export default UserManagement;
