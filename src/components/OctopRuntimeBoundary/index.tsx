import { useLocation, useModel } from '@umijs/max';
import { useEffect } from 'react';
import WujieReact from 'wujie-react';
import { OCTOP_BASE_URL } from '@/config/externalApps';
import { OCTOP_STATUS_EVENT } from '@/utils/octopBridge';
import {
  destroyOctopInstance,
  getOctopInstanceName,
} from '@/utils/octopRuntime';
import { resolveWorkspaceRouteDecision } from '@/utils/workspaceAccess';
import {
  getOrganizationAppPagePath,
  getOrganizationHomePath,
  getPlatformAppPagePath,
  getPlatformHomePath,
  resolveWorkspaceScopeFromPath,
} from '@/utils/workspaceRoutes';

const OctopRuntimeBoundary = () => {
  const { initialState } = useModel('@@initialState');
  const { pathname } = useLocation();
  const user = initialState?.currentUser;
  const scope = resolveWorkspaceScopeFromPath(pathname);
  let instanceName: string | undefined;
  const homePath =
    scope?.kind === 'organization'
      ? getOrganizationHomePath(scope.organizationId)
      : getPlatformHomePath();

  if (user?.userId && scope) {
    const octopPath =
      scope.kind === 'platform'
        ? getPlatformAppPagePath('octop', 'overview')
        : getOrganizationAppPagePath(scope.organizationId, 'octop', 'overview');
    if (
      resolveWorkspaceRouteDecision(user, octopPath, initialState?.authSession)
        .kind === 'allow'
    ) {
      instanceName = getOctopInstanceName(user.userId, scope);
    }
  }

  useEffect(() => {
    if (!instanceName) return;
    return () => {
      void destroyOctopInstance(instanceName);
    };
  }, [instanceName]);

  const homeInstanceName = pathname === homePath ? instanceName : undefined;
  useEffect(() => {
    if (!homeInstanceName) return;
    // 预执行让 Octop 校验已有登录；打开助手页时复用同名保活实例。
    WujieReact.preloadApp({
      name: homeInstanceName,
      url: OCTOP_BASE_URL,
      alive: true,
      exec: true,
      beforeLoad: () =>
        WujieReact.bus.$emit(OCTOP_STATUS_EVENT, { status: 'checking' }),
      loadError: () =>
        WujieReact.bus.$emit(OCTOP_STATUS_EVENT, { status: 'offline' }),
    });
  }, [homeInstanceName]);

  return null;
};

export default OctopRuntimeBoundary;
