import { Navigate, useModel } from '@umijs/max';
import { resolveLandingPath } from '@/utils/workspaceRoutes';

/**
 * 历史等待授权 URL 的兼容入口。
 * 统一 Project 首页开放后，任何已认证用户都会立即回到公共工作台。
 */
const AccessPendingPage = () => {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;

  // 未登录跳转仍由 app.tsx 统一处理，避免在兼容页维护第二套认证逻辑。
  if (!currentUser) return null;

  return <Navigate replace to={resolveLandingPath()} />;
};

export default AccessPendingPage;
