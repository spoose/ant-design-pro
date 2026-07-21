import { history } from '@umijs/max';
import type { AuthCurrentUser } from '@/services/auth';
import { getWorkspaceOrganizationId } from '@/utils/workspaceRoutes';
import { getOrganizationAccess } from '@/utils/workspaceRules';

/**
 * @see https://umijs.org/docs/max/access#access
 * */
//权限码的补充
export default function access(
  initialState: { currentUser?: AuthCurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  // Organization 切换会整页加载，因此 Umi Access 可以直接从当前 URL 选择权限域。
  const organizationId = getWorkspaceOrganizationId(history.location.pathname);
  const permissions =
    currentUser && organizationId
      ? getOrganizationAccess(currentUser, organizationId).permissions
      : [];
  const hasPermission = (permission: string) =>
    permissions.includes('*') || permissions.includes(permission);

  return {
    // Umi access only controls frontend visibility; backend APIs must enforce the same permissions.
    hasPermission,
    // canXxx 是 Umi 前端访问策略名，右侧 page:* 才是后端返回的页面权限码。
    canHome: hasPermission('page:home'),
    canDashboardAnalysis: hasPermission('page:dashboard-analysis'),
    canDashboardMonitor: hasPermission('page:dashboard-monitor'),
    canDashboardWorkplace: hasPermission('page:dashboard-workplace'),
    canOperationsConfig: hasPermission('page:operations-config'),
    canAiAssistant: hasPermission('page:ai-assistant'),
    canAdmin: hasPermission('page:admin'),
  };
}
