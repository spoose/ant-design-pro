import { InteractionOutlined, SettingOutlined } from '@ant-design/icons';
import { history, useLocation, useModel } from '@umijs/max';
import type { MenuProps } from 'antd';
import { App, Button } from 'antd';
import { useState } from 'react';
import { getAuthErrorDetails } from '@/services/auth';
import { switchAuthSessionOrganization } from '@/services/auth-session';
import {
  getOrganizationHomePath,
  getPlatformHomePath,
  getWorkspaceOrganizationId,
  isPlatformWorkspacePath,
} from '@/utils/workspaceRoutes';
import { getAccessibleOrganizations } from '@/utils/workspaceRules';
import HeaderDropdown from '../HeaderDropdown';
import useHeaderActionStyles from './style';

/** 管理入口是 Project Scope，不是虚拟 Organization，也不会触发组织换 Token。 */
const PROJECT_MANAGEMENT_SCOPE_KEY = 'project-management';
const getOrganizationScopeKey = (organizationId: string) =>
  `organization:${organizationId}`;

/**
 * WorkspaceScope 切换器。
 * XOne 组织切换先原子替换 Token/Session，再整页导航卸载旧组织内存状态。
 */
export const OrganizationSwitch: React.FC = () => {
  const { styles } = useHeaderActionStyles();
  const { message, notification } = App.useApp();
  /** 当前正在换取 Token 的目标组织；同时驱动按钮 loading 和菜单禁用。 */
  const [switchingOrganizationId, setSwitchingOrganizationId] = useState<
    string | undefined
  >();
  // pathname 来源于 Umi Browser Router，是当前 Platform/Organization Scope 的唯一标识。
  const { pathname } = useLocation();
  // currentUser 来源于认证会话；XOne 当前由登录上下文 + listOrgs 构建。
  const { initialState, setInitialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  // 旧 isSuperAdmin 当前由认证适配层映射为 Project Admin；普通用户不显示管理入口。
  const canEnterProjectManagement = Boolean(currentUser?.isSuperAdmin);
  // 后端已经过滤可进入组织；前端这里只去重，不组合或扩大权限。
  const organizations = currentUser
    ? getAccessibleOrganizations(currentUser)
    : [];
  const currentOrganizationId = getWorkspaceOrganizationId(pathname);
  const currentOrganization = organizations.find(
    (organization) => organization.organizationId === currentOrganizationId,
  );
  const isPlatformScope = isPlatformWorkspacePath(pathname);
  const selectedKey =
    isPlatformScope && canEnterProjectManagement
      ? PROJECT_MANAGEMENT_SCOPE_KEY
      : currentOrganization
        ? getOrganizationScopeKey(currentOrganization.organizationId)
        : undefined;
  const currentScopeLabel = isPlatformScope
    ? canEnterProjectManagement
      ? '项目控制台'
      : '工作台'
    : (currentOrganization?.organizationName ?? '未选择组织');

  /**
   * 核心链路：目标组织 -> selectAndChangeOrg -> 校验并提交新 Token/Session
   * -> initialState -> 目标首页整页导航。失败时会话服务恢复旧 Token，本组件保持原 URL。
   */
  const handleSwitch: MenuProps['onClick'] = async ({ key }) => {
    if (switchingOrganizationId) return;
    if (key === PROJECT_MANAGEMENT_SCOPE_KEY && canEnterProjectManagement) {
      // Project 管理沿用当前已验证会话；这里只导航，禁止调用 selectAndChangeOrg。
      history.push(getPlatformHomePath());
      return;
    }

    const target = organizations.find(
      (organization) =>
        getOrganizationScopeKey(organization.organizationId) === key,
    );
    if (!target || target.organizationId === currentOrganizationId) return;

    notification.destroy('organization-switch-error');
    setSwitchingOrganizationId(target.organizationId);
    try {
      const session = await switchAuthSessionOrganization(
        target.organizationId,
        { skipErrorHandler: true },
      );
      setInitialState((state) => ({
        ...state,
        authSession: session,
        currentUser: session.currentUser,
      }));
      message.success(`已切换至${target.organizationName}`);
      // 整页刷新确保旧组织组件、请求和内存状态不会进入新组织 Scope。
      window.location.assign(getOrganizationHomePath(target.organizationId));
    } catch (error) {
      const details = getAuthErrorDetails(error);
      notification.error({
        key: 'organization-switch-error',
        title: '切换组织失败',
        description: details.message,
        placement: 'topRight',
        role: 'alert',
      });
    } finally {
      setSwitchingOrganizationId(undefined);
    }
  };

  const items: MenuProps['items'] = [
    ...organizations.map((organization) => ({
      key: getOrganizationScopeKey(organization.organizationId),
      label: organization.organizationName,
      disabled: Boolean(switchingOrganizationId),
    })),
    ...(canEnterProjectManagement
      ? [
          {
            type: 'divider' as const,
          },
          {
            key: PROJECT_MANAGEMENT_SCOPE_KEY,
            label: '项目控制台',
            icon: <SettingOutlined />,
            disabled: Boolean(switchingOrganizationId),
          },
        ]
      : []),
  ];

  return (
    <HeaderDropdown
      placement="bottomRight"
      arrow
      trigger={['click']}
      menu={{
        selectedKeys: selectedKey ? [selectedKey] : [],
        onClick: handleSwitch,
        items: items.length
          ? items
          : [{ key: 'empty', label: '暂无可用组织', disabled: true }],
        style: { minWidth: 180 },
      }}
    >
      <Button
        aria-label={`切换工作区，当前为${currentScopeLabel}`}
        aria-busy={Boolean(switchingOrganizationId)}
        className={styles.action}
        loading={Boolean(switchingOrganizationId)}
        type="text"
      >
        <InteractionOutlined />
      </Button>
    </HeaderDropdown>
  );
};
