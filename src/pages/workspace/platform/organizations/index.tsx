import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { App, Button, Popconfirm, Space } from 'antd';
import { createStyles } from 'antd-style';
import { useCallback, useMemo, useRef, useState } from 'react';
import { radii } from '@/theme/radius';
import {
  actionColors,
  actionPillClassName,
  statusColors,
  statusPillClassName,
} from '@/theme/statusColors';
import { getOrganizationHomePath } from '@/utils/workspaceRoutes';
import { getPlatformAccess } from '@/utils/workspaceRules';
import type {
  OrganizationFormValues,
  OrganizationStatus,
  OrganizationSummary,
} from './data.d';
import {
  createOrganization,
  deleteOrganization,
  getOrganizationErrorDetails,
  listOrganizations,
  updateOrganization,
} from './service';

const ORGANIZATION_ERROR_NOTIFICATION_KEY = 'organization-management-error';

const useStyles = createStyles(({ css }) => ({
  /** 查询区是带 ant-pro-card class 的 div，需压过 ProCard token 圆角。 */
  searchCard: css`
    border-radius: ${radii.tableCard}px !important;
    overflow: hidden;
  `,
}));

const statusOptions = [
  { label: '已启用', value: 'active' },
  { label: '已停用', value: 'disabled' },
] satisfies Array<{ label: string; value: OrganizationStatus }>;

const statusValueEnum = {
  active: { text: '已启用', status: 'Success' },
  disabled: { text: '已停用', status: 'Default' },
} as const;

/** 组织状态胶囊：已启用→success(Running)，已停用→warning(Idle)。 */
const OrganizationStatusPill = ({ status }: { status: OrganizationStatus }) => {
  const semantic = status === 'active' ? 'success' : 'warning';
  const colors = statusColors[semantic];
  return (
    <span
      className={statusPillClassName[semantic]}
      style={{ backgroundColor: colors.soft, color: colors.ink }}
    >
      {status === 'active' ? '已启用' : '已停用'}
    </span>
  );
};

const OrganizationManagement = () => {
  const { styles } = useStyles();
  const { initialState, setInitialState } = useModel('@@initialState');
  const { message, notification } = App.useApp();
  const actionRef = useRef<ActionType | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] =
    useState<OrganizationSummary>();
  const [deletingOrganizationId, setDeletingOrganizationId] =
    useState<string>();

  const currentUser = initialState?.currentUser;
  const platformAccess = currentUser
    ? getPlatformAccess(currentUser)
    : undefined;
  const canCreate =
    platformAccess?.hasPermission('platform:organization:create') ?? false;
  const canUpdate =
    platformAccess?.hasPermission('platform:organization:update') ?? false;
  const canDelete =
    platformAccess?.hasPermission('platform:organization:delete') ?? false;
  const accessibleOrganizationIds = useMemo(
    () =>
      new Set(
        (currentUser?.organizations ?? []).map(
          (organization) => organization.organizationId,
        ),
      ),
    [currentUser?.organizations],
  );

  const showRequestError = useCallback(
    (title: string, error: unknown) => {
      const details = getOrganizationErrorDetails(error);
      notification.error({
        key: ORGANIZATION_ERROR_NOTIFICATION_KEY,
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

  const refreshCurrentUser = useCallback(async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (!userInfo) throw new Error('未能刷新当前用户的组织权限');

    setInitialState((state) => ({
      ...state,
      currentUser: userInfo,
    }));
  }, [initialState?.fetchUserInfo, setInitialState]);

  const handleDelete = useCallback(
    async (organization: OrganizationSummary) => {
      setDeletingOrganizationId(organization.organizationId);
      notification.destroy(ORGANIZATION_ERROR_NOTIFICATION_KEY);
      try {
        await deleteOrganization(organization.organizationId, {
          skipErrorHandler: true,
        });
        message.success(`已删除组织“${organization.organizationName}”`);
        actionRef.current?.reload();
        try {
          await refreshCurrentUser();
        } catch (error) {
          showRequestError('组织已删除，但权限状态刷新失败', error);
        }
      } catch (error) {
        showRequestError('删除组织失败', error);
      } finally {
        setDeletingOrganizationId(undefined);
      }
    },
    [message, notification, refreshCurrentUser, showRequestError],
  );

  const columns = useMemo<ProColumns<OrganizationSummary>[]>(
    () => [
      {
        title: '关键词',
        dataIndex: 'keyword',
        hideInTable: true,
        fieldProps: {
          allowClear: true,
          placeholder: '组织名称或编码',
        },
      },
      {
        title: '组织',
        dataIndex: 'organizationName',
        search: false,
        render: (_, record) => (
          <div className="grid gap-0.5">
            <strong className="font-medium text-zinc-900 dark:text-zinc-100">
              {record.organizationName}
            </strong>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {record.organizationCode}
            </span>
          </div>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        valueEnum: statusValueEnum,
        render: (_, record) => (
          <OrganizationStatusPill status={record.status} />
        ),
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        valueType: 'dateTime',
        search: false,
        width: 190,
      },
      {
        title: '操作',
        valueType: 'option',
        width: 260,
        render: (_, record) => (
          <Space size={8} wrap>
            {accessibleOrganizationIds.has(record.organizationId) ? (
              <button
                className={`${actionPillClassName} cursor-pointer`}
                style={{
                  backgroundColor: actionColors.soft,
                  color: actionColors.ink,
                }}
                onClick={() => {
                  history.push(getOrganizationHomePath(record.organizationId));
                }}
                type="button"
              >
                进入组织
              </button>
            ) : null}
            {canUpdate ? (
              <button
                className={`${actionPillClassName} cursor-pointer`}
                style={{
                  backgroundColor: actionColors.soft,
                  color: actionColors.ink,
                }}
                onClick={() => {
                  setEditingOrganization(record);
                  setFormOpen(true);
                }}
                type="button"
              >
                编辑
              </button>
            ) : null}
            {canDelete ? (
              <Popconfirm
                title="确认删除组织？"
                description="仅空组织，或只包含创建者初始化成员和授权的组织可以删除。"
                okText="删除"
                cancelText="取消"
                okButtonProps={{
                  danger: true,
                  loading: deletingOrganizationId === record.organizationId,
                }}
                onConfirm={() => handleDelete(record)}
              >
                <button
                  className={`${statusPillClassName.error} cursor-pointer`}
                  style={{
                    backgroundColor: statusColors.error.soft,
                    color: statusColors.error.ink,
                  }}
                  type="button"
                >
                  删除
                </button>
              </Popconfirm>
            ) : null}
          </Space>
        ),
      },
    ],
    [
      accessibleOrganizationIds,
      canDelete,
      canUpdate,
      deletingOrganizationId,
      handleDelete,
    ],
  );

  const handleSubmit = async (values: OrganizationFormValues) => {
    notification.destroy(ORGANIZATION_ERROR_NOTIFICATION_KEY);
    const isEditing = Boolean(editingOrganization);
    try {
      if (editingOrganization) {
        await updateOrganization(
          editingOrganization.organizationId,
          {
            organizationName: values.organizationName.trim(),
            status: values.status,
          },
          { skipErrorHandler: true },
        );
      } else {
        await createOrganization(
          {
            organizationCode: values.organizationCode.trim().toUpperCase(),
            organizationName: values.organizationName.trim(),
            status: values.status,
          },
          { skipErrorHandler: true },
        );
      }
    } catch (error) {
      showRequestError(isEditing ? '更新组织失败' : '创建组织失败', error);
      return false;
    }

    message.success(isEditing ? '组织已更新' : '组织已创建');
    actionRef.current?.reload();
    try {
      await refreshCurrentUser();
    } catch (error) {
      showRequestError(
        isEditing
          ? '组织已更新，但权限状态刷新失败'
          : '组织已创建，但权限状态刷新失败',
        error,
      );
    }
    return true;
  };

  return (
    <>
      <ProTable<OrganizationSummary>
        cardProps={{
          style: {
            borderRadius: radii.tableCard,
            overflow: 'hidden',
          },
        }}
        actionRef={actionRef}
        columns={columns}
        rowKey="organizationId"
        search={{
          labelWidth: 'auto',
          className: styles.searchCard,
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() =>
          canCreate
            ? [
                <Button
                  key="create"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingOrganization(undefined);
                    setFormOpen(true);
                  }}
                >
                  新建组织
                </Button>,
              ]
            : []
        }
        request={async (params) => {
          notification.destroy(ORGANIZATION_ERROR_NOTIFICATION_KEY);
          try {
            const response = await listOrganizations({
              skipErrorHandler: true,
            });
            const keyword =
              typeof params.keyword === 'string'
                ? params.keyword.trim().toLowerCase()
                : '';
            const requestedStatus =
              params.status === 'active' || params.status === 'disabled'
                ? params.status
                : undefined;
            const filteredOrganizations = response.data.filter(
              (organization) =>
                (!keyword ||
                  organization.organizationName
                    .toLowerCase()
                    .includes(keyword) ||
                  organization.organizationCode
                    .toLowerCase()
                    .includes(keyword)) &&
                (!requestedStatus || organization.status === requestedStatus),
            );
            const current = params.current ?? 1;
            const pageSize = params.pageSize ?? 10;
            const start = (current - 1) * pageSize;
            return {
              data: filteredOrganizations.slice(start, start + pageSize),
              success: true,
              total: filteredOrganizations.length,
            };
          } catch (error) {
            showRequestError('加载组织列表失败', error);
            throw error;
          }
        }}
      />

      <ModalForm<OrganizationFormValues>
        key={editingOrganization?.organizationId ?? 'create'}
        open={formOpen}
        title={editingOrganization ? '编辑组织' : '新建组织'}
        width={520}
        initialValues={
          editingOrganization
            ? {
                organizationCode: editingOrganization.organizationCode,
                organizationName: editingOrganization.organizationName,
                status: editingOrganization.status,
              }
            : { status: 'active' }
        }
        modalProps={{
          destroyOnHidden: true,
          okText: editingOrganization ? '保存' : '创建',
          cancelText: '取消',
        }}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingOrganization(undefined);
        }}
        onFinish={handleSubmit}
      >
        <ProFormText
          name="organizationCode"
          label="组织编码"
          disabled={Boolean(editingOrganization)}
          extra={
            editingOrganization
              ? '组织创建后编码不可修改。'
              : '创建后不可修改，将自动保存为大写。'
          }
          fieldProps={{ autoComplete: 'off' }}
          rules={[
            { required: true, message: '请输入组织编码' },
            { min: 2, message: '组织编码至少需要 2 个字符' },
            { max: 64, message: '组织编码不能超过 64 个字符' },
            {
              pattern: /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
              message: '只能包含字母、数字、下划线和连字符',
            },
          ]}
        />
        <ProFormText
          name="organizationName"
          label="组织名称"
          fieldProps={{ autoComplete: 'organization' }}
          rules={[
            { required: true, whitespace: true, message: '请输入组织名称' },
            { max: 120, message: '组织名称不能超过 120 个字符' },
          ]}
        />
        <ProFormSelect<OrganizationStatus>
          name="status"
          label="组织状态"
          options={statusOptions}
          rules={[{ required: true, message: '请选择组织状态' }]}
        />
      </ModalForm>
    </>
  );
};

export default OrganizationManagement;
