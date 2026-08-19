import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pushWorkspaceRecent } from '@/utils/workspaceRecents';
import { buildWorkspaceScopeKey } from '@/utils/workspaceState';
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
    useModel: () => ({
      initialState: { currentUser: { userId: 'user-1' } },
    }),
  };
});

const scopeKey = buildWorkspaceScopeKey({ kind: 'platform' });
const homeUrl = '/workspace/platform/overview';

describe('PlatformQuickEntry', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('pins xOneAI first even with no history', () => {
    render(<PlatformQuickEntry />);

    expect(screen.getByRole('heading', { name: '快速入口' })).toBeVisible();
    expect(screen.getByText('1 项')).toBeVisible();
    expect(screen.getByRole('link', { name: '打开 xOneAI' })).toHaveAttribute(
      'href',
      '/workspace/platform/apps/ai-assistant/overview',
    );
    expect(
      screen.queryByRole('button', { name: '从快速入口移除 xOneAI' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('暂无最近打开')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '打开 xOneAI' }).querySelector('img'),
    ).toHaveAttribute('src', 'https://img.icons8.com/color/96/message-bot.png');
  });

  it('keeps a single xOneAI pin ahead of other recents', () => {
    pushWorkspaceRecent(
      'user-1',
      scopeKey,
      {
        title: '文件审查',
        url: '/workspace/platform/apps/file-review/overview',
      },
      homeUrl,
    );
    pushWorkspaceRecent(
      'user-1',
      scopeKey,
      {
        title: 'xOneAI',
        url: '/workspace/platform/apps/ai-assistant/resources',
      },
      homeUrl,
    );

    render(<PlatformQuickEntry />);

    expect(
      screen
        .getAllByRole('link', { name: /^打开 / })
        .map((link) => link.getAttribute('href')),
    ).toEqual([
      '/workspace/platform/apps/ai-assistant/overview',
      '/workspace/platform/apps/file-review/overview',
    ]);
  });

  it('uses a different icon for each recent type', () => {
    const entries = [
      {
        title: 'xOneAI',
        url: '/workspace/platform/apps/ai-assistant/overview',
      },
      {
        title: '文件审查',
        url: '/workspace/platform/apps/file-review/overview',
      },
      {
        title: '文档总结',
        url: '/workspace/platform/apps/document-summary/overview',
      },
      {
        title: '知识检索',
        url: '/workspace/platform/apps/knowledge-search/overview',
      },
      { title: '用户规模', url: '/workspace/platform/stats/users' },
      { title: '请求用量', url: '/workspace/platform/stats/requests' },
      { title: '人员管理', url: '/workspace/platform/users' },
      { title: '权限管理', url: '/workspace/platform/permissions' },
    ];
    for (const entry of entries) {
      pushWorkspaceRecent('user-1', scopeKey, entry, homeUrl);
    }

    render(<PlatformQuickEntry />);

    const marks = screen
      .getAllByRole('link', { name: /^打开 / })
      .map((link) => link.querySelector('img')?.getAttribute('src'));
    expect(marks.every(Boolean)).toBe(true);
    expect(new Set(marks).size).toBe(marks.length);
  });

  it('removes a recent entry without following the link', () => {
    pushWorkspaceRecent(
      'user-1',
      scopeKey,
      {
        title: '文件审查',
        url: '/workspace/platform/apps/file-review/overview',
      },
      homeUrl,
    );

    render(<PlatformQuickEntry />);
    fireEvent.click(
      screen.getByRole('button', { name: '从快速入口移除 文件审查' }),
    );

    expect(
      screen.queryByRole('link', { name: '打开 文件审查' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '打开 xOneAI' })).toBeVisible();
  });
});
