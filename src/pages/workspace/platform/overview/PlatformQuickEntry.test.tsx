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

const quickEntryIconSrc = (name: string) =>
  `/assets/icons/quick-entry/${name}.png`;

describe('PlatformQuickEntry', () => {
  it('lists granted admin and stats pages plus account settings', () => {
    render(
      <PlatformQuickEntry
        appCodes={[]}
        getAppPath={(appCode) => `/apps/${appCode}/overview`}
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
      [
        '用户管理',
        '/workspace/platform/users',
        quickEntryIconSrc('conference'),
      ],
      ['日志', '/workspace/platform/logs', quickEntryIconSrc('document')],
      [
        '用户规模',
        '/workspace/platform/stats/users',
        quickEntryIconSrc('bar-chart'),
      ],
      [
        '请求用量',
        '/workspace/platform/stats/requests',
        quickEntryIconSrc('combo-chart'),
      ],
      ['个人设置', '/account/settings', quickEntryIconSrc('settings')],
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
      <PlatformQuickEntry
        appCodes={[]}
        getAppPath={(appCode) => `/apps/${appCode}/overview`}
        permissions={['platform:organization:update']}
      />,
    );

    expect(
      screen
        .getAllByRole('link')
        .map((link) => link.getAttribute('aria-label')),
    ).toEqual(['用户规模', '请求用量', '个人设置']);
  });

  it('keeps the original shortcuts when the shared home passes no grants', () => {
    render(
      <PlatformQuickEntry
        appCodes={[]}
        getAppPath={(appCode) => `/apps/${appCode}/overview`}
        permissions={[]}
      />,
    );

    expect(screen.getByText('5 项')).toBeVisible();
    expect(
      screen
        .getAllByRole('link')
        .map((link) => link.getAttribute('aria-label')),
    ).toEqual(['用户管理', '日志', '用户规模', '请求用量', '个人设置']);
  });

  it('adds the drone operations app when the current Scope grants it', () => {
    render(
      <PlatformQuickEntry
        appCodes={['drone-operations']}
        getAppPath={(appCode) => `/apps/${appCode}/overview`}
        permissions={[]}
      />,
    );

    expect(screen.getByText('6 项')).toBeVisible();
    expect(screen.getByRole('link', { name: '政务低空' })).toHaveAttribute(
      'href',
      '/apps/drone-operations/overview',
    );
  });

  it('adds the integrated operations entry for its universal app code', () => {
    render(
      <PlatformQuickEntry
        appCodes={['integrated-operations']}
        getAppPath={(appCode) => `/apps/${appCode}/overview`}
        permissions={[]}
      />,
    );

    expect(screen.getByText('6 项')).toBeVisible();
    const integratedOperationsLink = screen.getByRole('link', {
      name: '集约运维',
    });

    expect(integratedOperationsLink).toHaveAttribute(
      'href',
      '/apps/integrated-operations/overview',
    );
    expect(integratedOperationsLink.querySelector('img')).toHaveAttribute(
      'src',
      quickEntryIconSrc('server'),
    );
  });
});
