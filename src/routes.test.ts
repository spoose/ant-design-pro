import { describe, expect, it } from 'vitest';
import routes from '../config/routes';

type RouteItem = {
  path?: string;
  name?: string;
  icon?: string;
  redirect?: string;
  component?: string;
  hideInMenu?: boolean;
  layout?: boolean;
  access?: string;
  wrappers?: string[];
  routes?: RouteItem[];
};

const findRoute = (
  routes: RouteItem[],
  path: string,
): RouteItem | undefined => {
  for (const route of routes) {
    if (route.path === path) return route;
    const child = route.routes && findRoute(route.routes, path);
    if (child) return child;
  }
  return undefined;
};

describe('main routes', () => {
  const appRoutes = routes as RouteItem[];

  it('keeps /home as a hidden compatibility landing route', () => {
    expect(appRoutes[1]).toMatchObject({
      path: '/home',
      component: './workspace/landing',
      hideInMenu: true,
      layout: false,
    });
  });

  it('uses the dynamic Workspace landing page for the root path', () => {
    expect(appRoutes.find((route) => route.path === '/')).toMatchObject({
      component: './workspace/landing',
      layout: false,
    });
  });

  it('mounts Platform and Organization pages under the URL namespace', () => {
    expect(
      findRoute(appRoutes, '/workspace/platform/:platformPageKey'),
    ).toMatchObject({ component: './workspace/platform' });
    expect(
      findRoute(appRoutes, '/workspace/platform/apps/:appKey/*'),
    ).toMatchObject({ component: './workspace/app' });
    expect(
      findRoute(appRoutes, '/workspace/org/:organizationId/home'),
    ).toMatchObject({ component: './Home' });
    expect(
      findRoute(appRoutes, '/workspace/org/:organizationId/members'),
    ).toMatchObject({ component: './workspace/members' });
    expect(
      findRoute(appRoutes, '/workspace/org/:organizationId/roles'),
    ).toMatchObject({
      component: './workspace/roles',
    });
    expect(
      findRoute(appRoutes, '/workspace/org/:organizationId/settings'),
    ).toMatchObject({ component: './workspace/settings' });
    expect(
      findRoute(appRoutes, '/workspace/platform/stats/:statsPageKey'),
    ).toMatchObject({ component: './workspace/stats' });
    expect(
      findRoute(
        appRoutes,
        '/workspace/org/:organizationId/stats/:statsPageKey',
      ),
    ).toMatchObject({ component: './workspace/stats' });
    expect(
      findRoute(appRoutes, '/workspace/org/:organizationId/apps/:appKey/*'),
    ).toMatchObject({ component: './workspace/app' });
  });

  it('guards every formal Workspace route with the shared route boundary', () => {
    const workspacePaths = [
      '/workspace/platform/apps/:appKey/*',
      '/workspace/platform/stats/:statsPageKey',
      '/workspace/platform/stats',
      '/workspace/platform/:platformPageKey',
      '/workspace/org/:organizationId/home',
      '/workspace/org/:organizationId/members',
      '/workspace/org/:organizationId/roles',
      '/workspace/org/:organizationId/settings',
      '/workspace/org/:organizationId/stats/:statsPageKey',
      '/workspace/org/:organizationId/stats',
      '/workspace/org/:organizationId/apps/:appKey/*',
    ];

    for (const path of workspacePaths) {
      expect(findRoute(appRoutes, path)?.wrappers).toEqual([
        '@/wrappers/workspaceAccess',
      ]);
    }
  });

  it.each([
    ['/admin', 'canAdmin'],
    ['/dashboard/analysis', 'canDashboardAnalysis'],
    ['/dashboard/monitor', 'canDashboardMonitor'],
    ['/dashboard/workplace', 'canDashboardWorkplace'],
    ['/form/basic-form', 'canOperationsConfig'],
    ['/chatbot', 'canAiAssistant'],
  ])('protects %s with %s', (path, accessCode) => {
    expect(findRoute(appRoutes, path)).toMatchObject({ access: accessCode });
  });

  it('keeps a route entry for the template examples menu group', () => {
    expect(findRoute(appRoutes, '/examples')).toMatchObject({
      name: 'examples',
      redirect: '/welcome',
    });
  });
});
