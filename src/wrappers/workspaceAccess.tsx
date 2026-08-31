import { Navigate, Outlet, useLocation, useModel } from '@umijs/max';
import { resolveWorkspaceRouteDecision } from '@/utils/workspaceAccess';

/**
 * Workspace 路由边界：把纯规则结果转换成 Umi Router 行为。
 * currentUser 尚未完成初始化时保持空白，认证兜底仍由 app.tsx onPageChange 负责。
 */
const WorkspaceAccess = () => {
  const { initialState } = useModel('@@initialState');
  const { pathname } = useLocation();
  const currentUser = initialState?.currentUser;
  const authSession = initialState?.authSession;
  if (!currentUser) return null;

  const decision = resolveWorkspaceRouteDecision(
    currentUser,
    pathname,
    authSession,
  );
  switch (decision.kind) {
    case 'allow':
      return <Outlet />;
    case 'redirect':
      return <Navigate replace to={decision.to} />;
    case 'forbidden':
      return <Navigate replace to="/exception/403" />;
    case 'not-found':
      return <Navigate replace to="/exception/404" />;
  }
};

export default WorkspaceAccess;
