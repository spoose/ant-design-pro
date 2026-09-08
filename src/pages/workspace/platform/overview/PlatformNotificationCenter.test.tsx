import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlatformNotificationCenter from './PlatformNotificationCenter';

const navigate = vi.fn();

vi.mock('@umijs/max', () => ({
  useNavigate: () => navigate,
}));

describe('PlatformNotificationCenter', () => {
  beforeEach(() => {
    navigate.mockReset();
  });

  it('collapses notifications after the first three', () => {
    render(<PlatformNotificationCenter />);

    expect(
      screen.queryByText('边缘节点版本更新已完成'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('机场禁区临时航线申请未通过'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('飞行任务数据备份已完成'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '展开其余 3 条通知' }));
    expect(screen.getByText('边缘节点版本更新已完成')).toBeVisible();
    expect(screen.getByText('机场禁区临时航线申请未通过')).toBeVisible();
    expect(screen.getByText('飞行任务数据备份已完成')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '收起通知' }));
    expect(
      screen.queryByText('机场禁区临时航线申请未通过'),
    ).not.toBeInTheDocument();
  });

  it('removes the expand control when a filter has three or fewer results', () => {
    render(<PlatformNotificationCenter />);

    fireEvent.click(screen.getByRole('button', { name: '待处理 3' }));

    expect(
      screen.queryByRole('button', { name: /展开其余/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('边缘节点版本更新已完成'),
    ).not.toBeInTheDocument();
  });
});
