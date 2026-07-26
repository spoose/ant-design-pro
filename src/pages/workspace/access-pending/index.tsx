import { Helmet, history, Navigate, useModel } from '@umijs/max';
import { App, Button, Result } from 'antd';
import { startTransition, useState } from 'react';
import { getAuthErrorDetails, logout } from '@/services/auth';
import { clearAccessToken } from '@/utils/authToken';
import {
  ACCESS_PENDING_PATH,
  resolveLandingPath,
} from '@/utils/workspaceRoutes';
import Settings from '../../../../config/defaultSettings';

const loginPath = '/user/login';

/**
 * 已认证但尚无任何可进入 Scope 时的中立主页。
 *
 * 数据链路：GET /api/currentUser -> resolveLandingPath() -> 等待授权页
 * -> 用户主动刷新 -> 再次 GET /api/currentUser -> 获得授权后进入目标 Workspace。
 */
const AccessPendingPage = () => {
  const { notification } = App.useApp();
  const { initialState, setInitialState } = useModel('@@initialState');
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // currentUser 是后端授权快照；本页不从用户名或前端角色推导任何访问权。
  const currentUser = initialState?.currentUser;
  const resolvedLandingPath = currentUser
    ? resolveLandingPath(currentUser)
    : ACCESS_PENDING_PATH;

  /**
   * 主动刷新授权快照；只有后端返回了组织或 Platform 权限才离开本页。
   * 网络或后端错误直接展示，不提供模拟数据和授权 fallback。
   */
  const handleRefreshAccess = async () => {
    const fetchUserInfo = initialState?.fetchUserInfo;
    if (!fetchUserInfo) {
      notification.error({
        title: '无法刷新访问权限',
        description: '当前页面缺少用户信息刷新函数，请重新登录后再试。',
        duration: false,
        closable: true,
      });
      return;
    }

    setRefreshing(true);
    try {
      const refreshedUser = await fetchUserInfo();
      // 401 时 fetchUserInfo 已清理 Token 并跳转登录页，无需生成第二套认证处理。
      if (!refreshedUser) return;

      startTransition(() => {
        setInitialState((state) => ({
          ...state,
          currentUser: refreshedUser,
        }));
      });

      const nextPath = resolveLandingPath(refreshedUser);
      if (nextPath !== ACCESS_PENDING_PATH) {
        history.replace(nextPath);
        return;
      }

      notification.info({
        title: '访问权限尚未更新',
        description: '未加入任何组织，请等待授权。',
        closable: true,
      });
    } catch (error) {
      const details = getAuthErrorDetails(error);
      notification.error({
        title: '刷新访问权限失败',
        description: (
          <div>
            <div>{details.message}</div>
            {details.traceId ? <div>追踪编号：{details.traceId}</div> : null}
          </div>
        ),
        duration: false,
        closable: true,
      });
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * 退出链路：通知后端 -> 无论确认接口是否成功都清理本地 JWT
   * -> 清空 initialState.currentUser -> 返回登录页。
   */
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout({ skipErrorHandler: true });
    } catch {
      // 后端不可达不应阻止当前设备清除本地登录态。
    } finally {
      clearAccessToken();
      setInitialState((state) => ({
        ...state,
        currentUser: undefined,
      }));
      history.replace(loginPath);
    }
  };

  if (!currentUser) return null;

  // 已获得权限的用户手动访问本页时，立即回到统一计算出的合法落点。
  if (resolvedLandingPath !== ACCESS_PENDING_PATH) {
    return <Navigate replace to={resolvedLandingPath} />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-5 py-12 dark:bg-zinc-950">
      <Helmet>
        <title>
          等待授权
          {Settings.title && ` - ${Settings.title}`}
        </title>
      </Helmet>
      <div className="w-full max-w-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <Result
          status="info"
          title="账户已创建，正在等待访问授权"
          subTitle={
            <span>
              {currentUser.name || currentUser.email}
              ，你目前尚未加入任何组织。 请等待管理员完成授权 JUSHU AI。
            </span>
          }
          extra={
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                loading={refreshing}
                onClick={handleRefreshAccess}
                type="primary"
              >
                刷新访问权限
              </Button>
              <Button
                disabled={refreshing}
                loading={loggingOut}
                onClick={handleLogout}
              >
                退出登录
              </Button>
            </div>
          }
        />
      </div>
    </main>
  );
};

export default AccessPendingPage;
