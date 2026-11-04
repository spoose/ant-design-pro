import { useLocation, useModel } from '@umijs/max';
import { useEffect } from 'react';
import {
  destroyOctopInstance,
  getOctopInstanceName,
} from '@/utils/octopRuntime';
import { resolveWorkspaceRouteDecision } from '@/utils/workspaceAccess';
import {
  getOrganizationAppPagePath,
  getPlatformAppPagePath,
  resolveWorkspaceScopeFromPath,
} from '@/utils/workspaceRoutes';

const OctopRuntimeBoundary = () => {
  const { initialState } = useModel('@@initialState');
  const { pathname } = useLocation();
  const user = initialState?.currentUser;
  const scope = resolveWorkspaceScopeFromPath(pathname);
  let instanceName: string | undefined;

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

  return null;
};

export default OctopRuntimeBoundary;
