import { Navigate, useModel } from '@umijs/max';
import { resolveLandingPath } from '@/utils/workspaceRoutes';

/**
 * 登录后默认入口以及旧 /home 的统一兼容页。
 *
 * 数据链路：getInitialState.currentUser -> resolveLandingPath()
 * -> React Router Navigate -> 目标 Workspace 首页。
 * 页面不根据 username 或全局 role 硬编码落点。
 */
const WorkspaceLandingPage = () => {
  // currentUser 来源于 POST /api/currentUser/get，包含 Platform 权限和后端默认 Organization。
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;

  // 未登录时由 getInitialState/onPageChange 跳转登录页，避免这里生成第二套认证守卫。
  if (!currentUser) return null;

  return <Navigate replace to={resolveLandingPath(currentUser)} />;
};

export default WorkspaceLandingPage;
