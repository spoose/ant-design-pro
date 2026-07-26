import { useLocation } from '@umijs/max';
import { Suspense } from 'react';
import { getSkillDefinition } from '@/config/skillRegistry';
import Loading from '@/loading';
import {
  getWorkspaceAppKey,
  getWorkspaceAppPageKey,
} from '@/utils/workspaceRoutes';
import SkillPlaceholderPage from './skill-placeholder';

/**
 * Workspace App 路由分发页。
 *
 * 数据链路：Umi pathname -> appKey/pageKey -> skillRegistry -> 对应 Skill 页面。
 * Registry 是页面实现、标签标题和 Sidebar 元数据的唯一映射源。
 */
const WorkspaceAppPage = () => {
  const { pathname } = useLocation();
  const appKey = getWorkspaceAppKey(pathname);
  const pageKey = getWorkspaceAppPageKey(pathname);
  const PageComponent = appKey
    ? getSkillDefinition(appKey)?.pageComponent
    : undefined;

  if (PageComponent) {
    return (
      <Suspense fallback={<Loading />}>
        <PageComponent pageKey={pageKey} />
      </Suspense>
    );
  }

  // 未实现的 Workspace Skill 使用明确占位页；原 /chatbot 模板路由继续独立保留。
  return (
    <SkillPlaceholderPage appKey={appKey ?? 'unknown'} pageKey={pageKey} />
  );
};

export default WorkspaceAppPage;
