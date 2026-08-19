import { BarChartOutlined } from '@ant-design/icons';
import { useParams } from '@umijs/max';
import { Tag } from 'antd';
import WorkspacePage from '@/components/WorkspacePage';
import { isStatsPageKey, type StatsPageKey } from '@/utils/workspaceRoutes';

const statsPageMeta: Record<
  StatsPageKey,
  { title: string; description: string }
> = {
  users: {
    title: '用户规模',
    description: '查看当前范围内的用户数量与活跃情况。',
  },
  requests: {
    title: '请求用量',
    description: '查看 AI 请求次数、成功与失败趋势。',
  },
  traces: {
    title: '操作痕迹',
    description: '查看请求与管理操作的明细记录。',
  },
};

/**
 * 统计子页占位。路由与侧栏已按 /dashboard 前缀接入，业务图表后续补齐。
 */
const WorkspaceStatsPage = () => {
  const { statsPageKey } = useParams<{ statsPageKey?: string }>();
  const pageKey = isStatsPageKey(statsPageKey) ? statsPageKey : 'users';
  const meta = statsPageMeta[pageKey];

  return (
    <WorkspacePage
      breadcrumb={['统计', meta.title]}
      title={meta.title}
      description={meta.description}
      actions={<Tag color="default">待开发</Tag>}
    >
      <section className="grid min-h-64 place-items-center border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid max-w-md justify-items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-lg bg-orange-50 text-xl text-orange-700 dark:bg-orange-950 dark:text-orange-300">
            <BarChartOutlined aria-hidden />
          </div>
          <h2 className="m-0 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {meta.title}页面待开发
          </h2>
          <p className="m-0 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            当前可以验证管理员侧栏入口、父子路径选中和刷新恢复；图表与明细将在后续接入。
          </p>
          <code className="mt-1 rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            stats / {pageKey}
          </code>
        </div>
      </section>
    </WorkspacePage>
  );
};

export default WorkspaceStatsPage;
