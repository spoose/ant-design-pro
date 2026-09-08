import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlatformWeeklyGoals, {
  type WeeklyGoalSummary,
} from './PlatformWeeklyGoals';

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath,
    matchPath,
    useNavigate: () => navigateMock,
  };
});

const weeklyGoalSummary: WeeklyGoalSummary = {
  weekLabel: '第 36 周',
  dateRange: '9 月 1 日—9 月 7 日',
  groups: [
    {
      key: 'priority',
      label: '重点目标',
      goals: [
        {
          key: 'route-risk-review',
          title: '完成低空航线风险规则评审',
          status: 'in-progress',
        },
        {
          key: 'approval-plan',
          title: '提交无人机巡检审批优化方案',
          status: 'planned',
        },
      ],
    },
    {
      key: 'follow-up',
      label: '跟进事项',
      goals: [
        {
          key: 'charging-review',
          title: '复盘充电桩离线告警',
          status: 'completed',
        },
      ],
    },
  ],
};

describe('PlatformWeeklyGoals', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('prompts for a weekly report when no goal summary exists', () => {
    render(<PlatformWeeklyGoals />);

    expect(screen.getByText('上传周报，生成每周目标')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '上传周报' }));

    expect(navigateMock).toHaveBeenCalledWith(
      '/workspace/platform/apps/ai-assistant/overview',
      { state: { prompt: '上传周报并生成本周目标' } },
    );
  });

  it('renders grouped weekly goals when a summary exists', () => {
    render(<PlatformWeeklyGoals summary={weeklyGoalSummary} />);

    expect(screen.getByText('第 36 周')).toBeVisible();
    expect(screen.getByText('9 月 1 日—9 月 7 日 · 3 项')).toBeVisible();
    expect(screen.getByRole('heading', { name: '重点目标' })).toBeVisible();
    expect(screen.getByText('完成低空航线风险规则评审')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: '上传周报' }),
    ).not.toBeInTheDocument();
  });
});
