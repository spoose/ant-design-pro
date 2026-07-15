import { describe, expect, it } from 'vitest';
import routes from '../config/routes';

type RouteItem = {
  path?: string;
  name?: string;
  icon?: string;
  redirect?: string;
  access?: string;
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

  it('places home first in the authenticated menu', () => {
    expect(appRoutes[1]).toMatchObject({
      path: '/home',
      name: 'home',
      icon: 'home',
    });
  });

  it('redirects the root path to home', () => {
    expect(appRoutes.find((route) => route.path === '/')).toMatchObject({
      redirect: '/home',
    });
  });

  it.each([
    ['/home', 'canHome'],
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
