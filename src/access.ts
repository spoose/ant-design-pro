import type { AuthCurrentUser } from '@/services/auth';

/**
 * @see https://umijs.org/docs/max/access#access
 * */
//权限码的补充
export default function access(
  initialState:
    | { currentUser?: AuthCurrentUser; currentContextId?: string }
    | undefined,
) {
  const { currentUser } = initialState ?? {};
  // 权限来自 GET /api/currentUser 的当前 context，只在该 context 生命周期内生效。
  const currentContext = currentUser?.contexts.find(
    (context) => context.id === initialState?.currentContextId,
  );
  const permissions = currentContext?.permissions ?? [];
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
