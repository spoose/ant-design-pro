import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceAppList from '.';

vi.mock('@umijs/max', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe('WorkspaceAppList', () => {
  it('links the drone operations mock from the app launch strip', () => {
    render(
      <WorkspaceAppList
        emptyDescription="暂无应用"
        getAppPath={(appCode) => `/apps/${appCode}/overview`}
        appCodes={['drone-operations']}
        title="项目应用"
      />,
    );

    expect(screen.getByRole('link', { name: '打开 政务低空' })).toHaveAttribute(
      'href',
      '/apps/drone-operations/overview',
    );
  });

  it('uses the current Scope path builder for App links', () => {
    render(
      <WorkspaceAppList
        emptyDescription="暂无平台应用"
        getAppPath={(appCode) => `/workspace/platform/apps/${appCode}`}
        appCodes={['knowledge-search']}
        title="平台应用"
      />,
    );

    expect(screen.getByText('平台应用')).toBeVisible();
    expect(screen.getByRole('link', { name: '打开 知识检索' })).toHaveAttribute(
      'href',
      '/workspace/platform/apps/knowledge-search',
    );
    expect(screen.getByText('在知识库中检索资料与答案。')).toBeVisible();
  });

  it('explains when the current Scope has no available Apps', () => {
    render(
      <WorkspaceAppList
        emptyDescription="当前工作区暂无可用应用"
        getAppPath={(appCode) => `/apps/${appCode}`}
        appCodes={[]}
        title="可用应用"
      />,
    );

    expect(screen.getByText('0 项')).toBeVisible();
    expect(screen.getByText('当前工作区暂无可用应用')).toBeVisible();
  });

  it('identifies a backend-authorized App missing from the frontend registry', () => {
    render(
      <WorkspaceAppList
        emptyDescription="暂无应用"
        getAppPath={(appCode) => `/apps/${appCode}`}
        appCodes={['backend-only-app']}
        title="可用应用"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      '前端未定义应用：backend-only-app',
    );
  });

  it('places xOneAI first while preserving the remaining app order', () => {
    render(
      <WorkspaceAppList
        emptyDescription="暂无应用"
        getAppPath={(appCode) => `/apps/${appCode}`}
        appCodes={['file-review', 'knowledge-search', 'ai-assistant']}
        title="平台应用"
      />,
    );

    expect(
      screen
        .getAllByRole('link')
        .map((link) => link.getAttribute('aria-label')),
    ).toEqual(['打开 xOneAI', '打开 文件审查', '打开 知识检索']);
  });

  it('collapses overflow apps behind a more control that can expand', () => {
    render(
      <WorkspaceAppList
        emptyDescription="暂无应用"
        getAppPath={(appCode) => `/apps/${appCode}`}
        appCodes={[
          'ai-assistant',
          'file-review',
          'document-summary',
          'knowledge-search',
        ]}
        title="组织应用"
      />,
    );

    expect(screen.getByRole('link', { name: '打开 xOneAI' })).toBeVisible();
    expect(screen.getByRole('link', { name: '打开 文件审查' })).toBeVisible();
    expect(screen.getByRole('link', { name: '打开 文档总结' })).toBeVisible();
    expect(
      screen.queryByRole('link', { name: '打开 知识检索' }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: '更多，还有 1 个应用' }),
    );

    expect(screen.getByRole('link', { name: '打开 知识检索' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '收起' }));
    expect(
      screen.queryByRole('link', { name: '打开 知识检索' }),
    ).not.toBeInTheDocument();
  });
});
