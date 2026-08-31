import { useLocation } from '@umijs/max';
import { Suspense } from 'react';
import { getAppDefinition } from '@/config/appRegistry';
import Loading from '@/loading';
import {
  getWorkspaceAppKey,
  getWorkspaceAppPageKey,
} from '@/utils/workspaceRoutes';
import AppPlaceholderPage from './app-placeholder';

/**
 * Workspace App 路由分发页。
 *
 * 数据链路：Umi pathname -> appKey/pageKey -> appRegistry -> 对应 App 页面。
 * Registry 是页面实现、标签标题和 Sidebar 元数据的唯一映射源。
 */
const WorkspaceAppPage = () => {
  const { pathname } = useLocation();
  const appKey = getWorkspaceAppKey(pathname);
  const pageKey = getWorkspaceAppPageKey(pathname);
  const definition = appKey ? getAppDefinition(appKey) : undefined;
  const navigationItem = definition?.navigation.find(
    (item) => item.pathSegment === pageKey,
  );
  const PageComponent = navigationItem?.placeholder
    ? undefined
    : definition?.pageComponent;

  if (PageComponent) {
    return (
      <Suspense fallback={<Loading />}>
        <PageComponent pageKey={pageKey} />
      </Suspense>
    );
  }

  // 未实现的 Workspace App 使用明确占位页；原 /chatbot 模板路由继续独立保留。
  return <AppPlaceholderPage appKey={appKey ?? 'unknown'} pageKey={pageKey} />;
};

export default WorkspaceAppPage;
