import { useLocation, useModel } from '@umijs/max';
import { Tag } from 'antd';
import WorkspacePage from '@/components/WorkspacePage';
import { getSkillDefinition } from '@/config/skillRegistry';
import { buildWorkspaceBreadcrumb } from '@/utils/menuData';

type SkillPlaceholderPageProps = {
  /** 来源于 Workspace App URL 的 :appKey。 */
  appKey: string;
  /** 来源于 Workspace App URL 的第一个通配路径片段；根路径时为 undefined。 */
  pageKey?: string;
};

/**
 * 尚未实现业务页面的 Skill 占位视图。
 * 它保留真实的标签、URL 和 Sidebar 行为，但不会把所有 Skill 误导为同一个 AI 助手。
 */
const SkillPlaceholderPage = ({
  appKey,
  pageKey,
}: SkillPlaceholderPageProps) => {
  const { pathname } = useLocation();
  const { initialState } = useModel('@@initialState');
  const definition = getSkillDefinition(appKey);
  // Registry 中所有菜单使用并列 pathSegment，当前页面按 URL pageKey 精确命中。
  const navigationItem =
    definition?.navigation.find((item) => item.pathSegment === pageKey) ??
    definition?.navigation[0];
  const skillTitle = definition?.title ?? appKey;
  const pageTitle = navigationItem?.title ?? '应用首页';
  const SkillIcon = definition?.icon;

  const trail = [skillTitle, pageTitle];

  return (
    <WorkspacePage
      breadcrumb={
        appKey === 'ai-assistant'
          ? trail
          : buildWorkspaceBreadcrumb(initialState?.currentUser, pathname, trail)
      }
      title={pageTitle}
      description={`${skillTitle}的标签、路由和侧栏结构已经接入，业务内容将在后续步骤实现。`}
      actions={<Tag color="default">待开发</Tag>}
    >
      <section className="grid min-h-64 place-items-center border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid max-w-md justify-items-center gap-3">
          {SkillIcon ? (
            <div className="flex size-12 items-center justify-center rounded-lg bg-orange-50 text-xl text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              <SkillIcon aria-hidden />
            </div>
          ) : null}
          <h2 className="m-0 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {pageTitle}页面待开发
          </h2>
          <p className="m-0 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            当前可以验证应用标签切换、侧栏联动和刷新恢复；这里不再显示与业务无关的
            AI 对话界面。
          </p>
          <code className="mt-1 rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {appKey}
            {pageKey ? ` / ${pageKey}` : ''}
          </code>
        </div>
      </section>
    </WorkspacePage>
  );
};

export default SkillPlaceholderPage;
