import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlatformNotificationCard from './PlatformNotificationCard';

const navigate = vi.fn();
vi.mock('@umijs/max', () => ({ useNavigate: () => navigate }));

beforeEach(() => navigate.mockReset());

describe('PlatformNotificationCard', () => {
  it('keeps a three-notification preview when switching filters', () => {
    render(
      <PlatformNotificationCard notificationCenterPath="/workspace/platform/notifications" />,
    );
    expect(screen.getByRole('heading', { name: '通知' })).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(
      screen.queryByRole('button', { name: /展开其余|收起通知/ }),
    ).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: '已处理 3' }));
    expect(screen.getByText('边缘节点版本更新已完成')).toBeVisible();
    expect(screen.queryByText('水库大坝巡检 · 航线等待批准')).toBeNull();
    expect(
      screen.queryByRole('button', { name: /展开其余|收起通知/ }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: /去处理/ })).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: '全部 6' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(
      screen.queryByRole('button', { name: /展开其余|收起通知/ }),
    ).toBeNull();
  });

  it('includes processing notifications in the pending filter', () => {
    render(
      <PlatformNotificationCard notificationCenterPath="/workspace/platform/notifications" />,
    );
    fireEvent.click(screen.getByRole('radio', { name: '待处理 3' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(
      screen.getByText('1 号机坪充电桩离线，运维人员正在处理'),
    ).toBeVisible();
    expect(screen.getByText('AI 建议')).toBeVisible();
    expect(screen.queryByText('边缘节点版本更新已完成')).toBeNull();
  });

  it('keeps detail and all-notification navigation inside the current scope', () => {
    const path = '/workspace/org/org-1/notifications';
    render(<PlatformNotificationCard notificationCenterPath={path} />);
    fireEvent.click(
      screen.getByRole('button', {
        name: '去处理：水库大坝巡检 · 航线等待批准',
      }),
    );
    expect(navigate).toHaveBeenLastCalledWith(
      `${path}?notification=drone-dam-inspection`,
    );
    fireEvent.click(screen.getByRole('button', { name: '查看全部通知' }));
    expect(navigate).toHaveBeenLastCalledWith(path);
  });
});
