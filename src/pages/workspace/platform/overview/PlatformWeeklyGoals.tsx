import { FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from '@umijs/max';
import { Button } from 'antd';
import { tagColors } from '@/theme/statusColors';
import { getPlatformAppPagePath } from '@/utils/workspaceRoutes';
import {
  platformOverviewCardClassName,
  platformOverviewCardHeaderClassName,
} from './cardChrome';

export type WeeklyGoalStatus = 'completed' | 'in-progress' | 'planned';

export type WeeklyGoalSummary = {
  weekLabel: string;
  dateRange: string;
  groups: Array<{
    key: string;
    label: string;
    goals: Array<{
      key: string;
      title: string;
      status: WeeklyGoalStatus;
    }>;
  }>;
};

export type PlatformWeeklyGoalsProps = {
  summary?: WeeklyGoalSummary;
};

const xoneAiOverview = getPlatformAppPagePath('ai-assistant', 'overview');
const weeklyReportPrompt = '上传周报并生成本周目标';

const goalStatusMeta: Record<
  WeeklyGoalStatus,
  { label: string; className: string }
> = {
  completed: {
    label: '已完成',
    className:
      'border-zinc-900 bg-zinc-900 after:h-1.5 after:w-2.5 after:-translate-y-px after:rotate-[-45deg] after:border-b-2 after:border-l-2 after:border-white dark:border-zinc-100 dark:bg-zinc-100 dark:after:border-zinc-900',
  },
  'in-progress': {
    label: '进行中',
    className:
      'border-zinc-900 after:size-1.5 after:rounded-sm after:bg-zinc-900 dark:border-zinc-100 dark:after:bg-zinc-100',
  },
  planned: {
    label: '待开始',
    className: 'border-zinc-300 dark:border-zinc-600',
  },
};

/** 周报驱动的 AI 目标摘要；无数据时提供清晰的生成入口。 */
const PlatformWeeklyGoals = ({ summary }: PlatformWeeklyGoalsProps) => {
  const navigate = useNavigate();
  const goalCount =
    summary?.groups.reduce((count, group) => count + group.goals.length, 0) ??
    0;

  return (
    <section
      aria-labelledby="platform-weekly-goals-title"
      className={`${platformOverviewCardClassName} min-h-80 w-full max-w-[25rem] xl:min-h-0`}
      data-testid="platform-weekly-goals"
    >
      <header
        className={`${platformOverviewCardHeaderClassName} justify-between gap-3`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <h2
            className="m-0 flex h-5 items-center truncate text-base font-semibold leading-5 text-zinc-950 dark:text-zinc-50"
            id="platform-weekly-goals-title"
          >
            AI 每周目标
          </h2>
          <span
            className="inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium leading-none"
            style={{
              backgroundColor: tagColors.knowledge.soft,
              color: tagColors.knowledge.ink,
            }}
          >
            AI
          </span>
        </div>
        <span className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          本周
        </span>
      </header>

      {summary ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 [scrollbar-color:#d4d4d8_transparent] [scrollbar-width:thin] dark:[scrollbar-color:#52525b_transparent]">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white py-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
            <span className="font-semibold text-zinc-700 dark:text-zinc-200">
              {summary.weekLabel}
            </span>
            <span className="truncate text-zinc-500 dark:text-zinc-400">
              {summary.dateRange} · {goalCount} 项
            </span>
          </div>

          <div className="space-y-4 pt-4">
            {summary.groups.map((group) => (
              <section
                aria-labelledby={`weekly-goal-group-${group.key}`}
                key={group.key}
              >
                <h3
                  className="m-0 mb-2 text-sm font-semibold leading-5 text-zinc-900 dark:text-zinc-100"
                  id={`weekly-goal-group-${group.key}`}
                >
                  {group.label}
                </h3>
                <ul className="m-0 list-none divide-y divide-zinc-200 p-0 dark:divide-zinc-800">
                  {group.goals.map((goal) => {
                    const status = goalStatusMeta[goal.status];

                    return (
                      <li
                        className="flex min-h-10 items-start gap-2.5 py-2"
                        key={goal.key}
                      >
                        <span
                          aria-label={status.label}
                          className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded border ${status.className}`}
                          role="img"
                        />
                        <span className="min-w-0 text-sm leading-5 text-zinc-700 dark:text-zinc-200">
                          {goal.title}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-4">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3 text-xs dark:border-zinc-800">
            <span className="font-semibold text-zinc-700 dark:text-zinc-200">
              本周计划
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">等待周报</span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center py-5 text-center">
            <h3 className="m-0 text-base font-semibold leading-6 text-zinc-950 dark:text-zinc-50">
              上传周报，生成每周目标
            </h3>
            <p className="mb-5 mt-2 max-w-72 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              AI 将提取进展、风险和下一步，整理为可跟进的任务清单。
            </p>
            <Button
              className="!h-8 w-fit self-center !rounded-md !border-zinc-950 !bg-zinc-950 !px-3 !text-sm !font-medium !text-white !shadow-none hover:!border-zinc-800 hover:!bg-zinc-800 dark:!border-zinc-100 dark:!bg-zinc-100 dark:!text-zinc-950 dark:hover:!border-white dark:hover:!bg-white"
              icon={<FileTextOutlined aria-hidden />}
              onClick={() =>
                navigate(xoneAiOverview, {
                  state: { prompt: weeklyReportPrompt },
                })
              }
              size="small"
              type="primary"
            >
              上传周报
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

export default PlatformWeeklyGoals;
