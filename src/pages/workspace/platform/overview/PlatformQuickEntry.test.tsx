import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import PlatformQuickEntry from './PlatformQuickEntry';

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath,
    matchPath,
    Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

const fluencySrc = (name: string) =>
  `https://img.icons8.com/fluency/96/${name}.png`;

describe('PlatformQuickEntry', () => {
  it('lists granted admin and stats pages plus account settings', () => {
    render(
      <PlatformQuickEntry
        permissions={['platform:user:manage', 'platform:audit:view']}
      />,
    );

    expect(screen.getByRole('heading', { name: '快速入口' })).toBeVisible();
    expect(
      screen.getByRole('region', { name: '快速入口' }).className,
    ).not.toContain('bg-white');
    expect(
      screen.getByRole('navigation', { name: '工作台快捷方式' }).className,
    ).toContain('bg-white');
    expect(
      screen.getByRole('link', { name: '用户管理' }).querySelector('span')
        ?.className,
    ).toContain('rounded-lg');
    expect(
      screen.getByRole('navigation', { name: '工作台快捷方式' }).className,
    ).toContain('flex');
    expect(screen.getByText('5 项')).toBeVisible();
    expect(
      screen
        .getAllByRole('link')
        .map((link) => [
          link.getAttribute('aria-label'),
          link.getAttribute('href'),
          link.querySelector('img')?.getAttribute('src'),
        ]),
    ).toEqual([
      ['用户管理', '/workspace/platform/users', fluencySrc('conference')],
      ['日志', '/workspace/platform/logs', fluencySrc('document')],
      ['用户规模', '/workspace/platform/stats/users', fluencySrc('bar-chart')],
      [
        '请求用量',
        '/workspace/platform/stats/requests',
        fluencySrc('combo-chart'),
      ],
      ['个人设置', '/account/settings', fluencySrc('settings')],
    ]);
    expect(
      screen.queryByRole('link', { name: '操作痕迹' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'xOneAI' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '组织管理' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '权限管理' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /从快速入口移除/ }),
    ).not.toBeInTheDocument();
  });

  it('hides user and log shortcuts without those grants', () => {
    render(
      <PlatformQuickEntry permissions={['platform:organization:update']} />,
    );

    expect(
      screen
        .getAllByRole('link')
        .map((link) => link.getAttribute('aria-label')),
    ).toEqual(['用户规模', '请求用量', '个人设置']);
  });

  it('keeps account settings when the workbench has no platform grants', () => {
    render(<PlatformQuickEntry permissions={[]} />);

    expect(screen.getByText('1 项')).toBeVisible();
    expect(screen.getByRole('link', { name: '个人设置' })).toHaveAttribute(
      'href',
      '/account/settings',
    );
    expect(
      screen.queryByRole('link', { name: '用户规模' }),
    ).not.toBeInTheDocument();
  });
});
