import { useLocation } from '@umijs/max';
import {
  getWorkspaceAppKey,
  getWorkspaceAppPageKey,
} from '@/utils/workspaceRoutes';
import FileReviewPage from './file-review';
import KnowledgeSearchPage from './knowledge-search';
import SkillPlaceholderPage from './skill-placeholder';

/**
 * Workspace App 路由分发页。
 *
 * 数据链路：Umi pathname -> appKey/pageKey -> 对应 Skill 页面。
 * 这里只选择页面组件；标签 ID 和 Sidebar 仍分别由 WorkspaceTabsHeader、menuData 从同一 URL 派生。
 */
const WorkspaceAppPage = () => {
  const { pathname } = useLocation();
  const appKey = getWorkspaceAppKey(pathname);
  const pageKey = getWorkspaceAppPageKey(pathname);

  if (appKey === 'file-review') {
    return <FileReviewPage pageKey={pageKey} />;
  }

  if (appKey === 'knowledge-search') {
    return <KnowledgeSearchPage pageKey={pageKey} />;
  }

  // 未实现的 Workspace Skill 使用明确占位页；原 /chatbot 模板路由继续独立保留。
  return (
    <SkillPlaceholderPage appKey={appKey ?? 'unknown'} pageKey={pageKey} />
  );
};

export default WorkspaceAppPage;
