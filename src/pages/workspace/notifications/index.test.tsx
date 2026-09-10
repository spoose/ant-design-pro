import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import NotificationCenterPage from './index';

vi.mock('@umijs/max', async () => await vi.importActual('react-router-dom'));
const open = (entry = '/workspace/platform/notifications') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <NotificationCenterPage />
    </MemoryRouter>,
  );

describe('通知中心', () => {
  it('opens a homepage deep link, confirms approval and updates the filter count', () => {
    open('/workspace/platform/notifications?notification=drone-dam-inspection');
    expect(screen.getByRole('heading', { name: '通知详情' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /批准申请/ }));
    expect(screen.getByRole('group', { name: '确认处理' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '确认完成' }));
    expect(
      screen.queryByRole('button', { name: /批准申请/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('演示：已完成处理');
    fireEvent.click(screen.getByRole('button', { name: /返回通知中心/ }));
    expect(screen.getByRole('button', { name: /待处理\s*2/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /已完成\s*3/ }));
    expect(screen.getByText('水库大坝巡检 · 航线等待批准')).toBeVisible();
  });
  it('allows canceling a rejection without changing the notification', () => {
    open(
      '/workspace/org/org-1/notifications?notification=weather-operation-notice',
    );
    fireEvent.click(screen.getByRole('button', { name: '驳回' }));
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(
      screen.queryByRole('group', { name: '确认处理' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /批准申请/ })).toBeVisible();
  });
  it('keeps the status filter when returning from details', () => {
    open('/workspace/platform/notifications?status=rejected');
    fireEvent.click(
      screen.getByRole('button', {
        name: '查看详情：机场禁区临时航线申请未通过',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /返回通知中心/ }));
    expect(screen.getByRole('button', { name: /已驳回\s*1/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.queryByText('水库大坝巡检 · 航线等待批准'),
    ).not.toBeInTheDocument();
  });
  it('provides recovery for an unknown notification', () => {
    open('/workspace/platform/notifications?notification=missing');
    expect(
      screen.getByRole('heading', { name: '未找到这条通知' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '返回列表' }));
    expect(screen.getByRole('heading', { name: '通知中心' })).toBeVisible();
  });
});
