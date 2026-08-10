import { InteractionOutlined } from '@ant-design/icons';
import { history, useLocation, useModel } from '@umijs/max';
import type { MenuProps } from 'antd';
import { Button } from 'antd';
import {
  getOrganizationHomePath,
  getPlatformHomePath,
  getWorkspaceOrganizationId,
  isPlatformWorkspacePath,
} from '@/utils/workspaceRoutes';
import {
  getAccessibleOrganizations,
  getPlatformAccess,
} from '@/utils/workspaceRules';
import HeaderDropdown from '../HeaderDropdown';
import useHeaderActionStyles from './style';

const PLATFORM_SCOPE_KEY = 'platform';
const getOrganizationScopeKey = (organizationId: string) =>
  `organization:${organizationId}`;

/**
 * WorkspaceScope 切换器。
 * 切换使用整页导航，确保旧 Organization 的组件、请求和内存状态全部卸载。
 */
export const OrganizationSwitch: React.FC = () => {
  const { styles } = useHeaderActionStyles();
  // pathname 来源于 Umi Browser Router，是当前 Platform/Organization Scope 的唯一标识。
  const { pathname } = useLocation();
  // currentUser 来源于 POST /api/currentUser/get，经 getInitialState 写入 Umi initialState。
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  // 后端已经过滤可进入组织；前端这里只去重，不组合或扩大权限。
  const organizations = currentUser
    ? getAccessibleOrganizations(currentUser)
    : [];
  const currentOrganizationId = getWorkspaceOrganizationId(pathname);
  const currentOrganization = organizations.find(
    (organization) => organization.organizationId === currentOrganizationId,
  );
  const canEnterPlatform = currentUser
    ? getPlatformAccess(currentUser).canEnterManagementCenter
    : false;
  const isPlatformScope = isPlatformWorkspacePath(pathname);
  const selectedKey = isPlatformScope
    ? PLATFORM_SCOPE_KEY
    : currentOrganization
      ? getOrganizationScopeKey(currentOrganization.organizationId)
      : undefined;
  const currentScopeLabel = isPlatformScope
    ? '管理中心'
    : (currentOrganization?.organizationName ?? '未选择组织');

  /**
   * 链路：下拉菜单 key -> 目标 Scope 首页 URL -> window.location.assign() -> 整页刷新。
   * 整页刷新会卸载旧组织组件和内存状态，确保不同 Organization 不同时存在。
   */
  const handleSwitch: MenuProps['onClick'] = ({ key }) => {
    if (key === PLATFORM_SCOPE_KEY && canEnterPlatform) {
      // window.location.assign(getPlatformHomePath());
      history.push(getPlatformHomePath());
      return;
    }

    const target = organizations.find(
      (organization) =>
        getOrganizationScopeKey(organization.organizationId) === key,
    );
    if (!target || target.organizationId === currentOrganizationId) return;

    window.location.assign(getOrganizationHomePath(target.organizationId));
    //    history.push(getOrganizationHomePath(target.organizationId));
  };

  const items: MenuProps['items'] = [
    ...(canEnterPlatform
      ? [{ key: PLATFORM_SCOPE_KEY, label: '管理中心' }]
      : []),
    ...organizations.map((organization) => ({
      key: getOrganizationScopeKey(organization.organizationId),
      label: organization.organizationName,
    })),
  ];

  return (
    <HeaderDropdown
      placement="bottomRight"
      arrow
      trigger={['hover']}
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
