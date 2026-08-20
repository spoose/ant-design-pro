import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlatformAppCatalog from './PlatformAppCatalog';

vi.mock('@umijs/max', () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe('PlatformAppCatalog', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  });
  it('renders every authorized app as a titled card', () => {
    render(
      <PlatformAppCatalog
        getSkillPath={(skillCode) => `/apps/${skillCode}`}
        skillCodes={['file-review', 'knowledge-search', 'ai-assistant']}
      />,
    );

    expect(screen.getByRole('heading', { name: '全部应用' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'xOneAI' })).toHaveAttribute(
      'href',
      '/apps/ai-assistant',
    );
    expect(screen.getByRole('link', { name: '文件审查' })).toBeVisible();
    expect(screen.getByRole('link', { name: '知识检索' })).toBeVisible();
    expect(screen.getByRole('link', { name: '会议纪要' })).toBeVisible();
    expect(screen.getByRole('link', { name: '数据看板' })).toBeVisible();
    expect(screen.getByRole('link', { name: '流程审批' })).toBeVisible();
    expect(screen.getByRole('link', { name: '通知中心' })).toBeVisible();
    expect(screen.getByRole('link', { name: '工单中心' })).toBeVisible();
    expect(screen.getByText('处理日常管理与协作任务')).toBeVisible();
  });

  it('collapses overflow apps behind a horizontal more control when narrow', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: query.includes('639px'),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });

    render(
      <PlatformAppCatalog
        getSkillPath={(skillCode) => `/apps/${skillCode}`}
        skillCodes={['ai-assistant', 'file-review']}
      />,
    );

    expect(screen.getByRole('link', { name: 'xOneAI' })).toBeVisible();
    expect(screen.getByRole('link', { name: '文件审查' })).toBeVisible();
    expect(screen.getByRole('link', { name: '会议纪要' })).toBeVisible();
    expect(screen.getByRole('link', { name: '数据看板' })).toBeVisible();
    expect(
      screen.queryByRole('link', { name: '流程审批' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '展开其余 3 个应用' }));
    expect(screen.getByRole('link', { name: '流程审批' })).toBeVisible();
    expect(screen.getByRole('link', { name: '通知中心' })).toBeVisible();
    expect(screen.getByRole('link', { name: '工单中心' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '收起' }));
    expect(
      screen.queryByRole('link', { name: '流程审批' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the extra app entries when no skills are authorized', () => {
    render(
      <PlatformAppCatalog
        emptyDescription="暂无授权应用。"
        getSkillPath={(skillCode) => `/apps/${skillCode}`}
        skillCodes={[]}
      />,
    );

    expect(screen.getByText('5 项')).toBeVisible();
    expect(screen.getByRole('link', { name: '会议纪要' })).toBeVisible();
    expect(screen.queryByText('暂无授权应用。')).not.toBeInTheDocument();
  });

  it('caps desktop preview at eight apps and expands in place', () => {
    render(
      <PlatformAppCatalog
        getSkillPath={(skillCode) => `/apps/${skillCode}`}
        skillCodes={[
          'ai-assistant',
          'file-review',
          'document-summary',
          'knowledge-search',
        ]}
      />,
    );

    expect(screen.getByText('9 项')).toBeVisible();
    expect(screen.getByRole('link', { name: '通知中心' })).toBeVisible();
    expect(
      screen.queryByRole('link', { name: '工单中心' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '展开其余 1 个应用' }));
    expect(screen.getByRole('link', { name: '工单中心' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '收起' }));
    expect(
      screen.queryByRole('link', { name: '工单中心' }),
    ).not.toBeInTheDocument();
  });
});
