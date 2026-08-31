import { InteractionOutlined, SettingOutlined } from '@ant-design/icons';
import { history, useLocation, useModel } from '@umijs/max';
import type { MenuProps } from 'antd';
import { Button } from 'antd';
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
 * Organization 切换使用整页导航，确保旧组织组件和内存状态全部卸载。
 */
export const OrganizationSwitch: React.FC = () => {
  const { styles } = useHeaderActionStyles();
  // pathname 来源于 Umi Browser Router，是当前 Platform/Organization Scope 的唯一标识。
  const { pathname } = useLocation();
  // currentUser 是当前登录用户及其可进入组织的授权快照。
  const { initialState } = useModel('@@initialState');
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
   * 核心链路：下拉菜单 key -> Project 管理或目标 Organization 首页。
   */
  const handleSwitch: MenuProps['onClick'] = ({ key }) => {
    if (key === PROJECT_MANAGEMENT_SCOPE_KEY && canEnterProjectManagement) {
      history.push(getPlatformHomePath());
      return;
    }

    const target = organizations.find(
      (organization) =>
        getOrganizationScopeKey(organization.organizationId) === key,
    );
    if (!target || target.organizationId === currentOrganizationId) return;

    window.location.assign(getOrganizationHomePath(target.organizationId));
  };

  const items: MenuProps['items'] = [
    ...organizations.map((organization) => ({
      key: getOrganizationScopeKey(organization.organizationId),
      label: organization.organizationName,
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
        className={styles.action}
        type="text"
      >
        <InteractionOutlined />
      </Button>
    </HeaderDropdown>
  );
};
