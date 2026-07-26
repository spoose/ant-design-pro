import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceSkillList from '.';

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

describe('WorkspaceSkillList', () => {
  it('uses the current Scope path builder for Skill links', () => {
    render(
      <WorkspaceSkillList
        emptyDescription="暂无平台应用"
        getSkillPath={(skillCode) => `/workspace/platform/apps/${skillCode}`}
        skillCodes={['knowledge-search']}
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

  it('explains when the current Scope has no available Skills', () => {
    render(
      <WorkspaceSkillList
        emptyDescription="当前工作区暂无可用应用"
        getSkillPath={(skillCode) => `/apps/${skillCode}`}
        skillCodes={[]}
        title="可用应用"
      />,
    );

    expect(screen.getByText('0 项')).toBeVisible();
    expect(screen.getByText('当前工作区暂无可用应用')).toBeVisible();
  });

  it('collapses overflow apps behind a more control that can expand', () => {
    render(
      <WorkspaceSkillList
        emptyDescription="暂无应用"
        getSkillPath={(skillCode) => `/apps/${skillCode}`}
        skillCodes={[
          'platform-assistant',
          'file-review',
          'document-summary',
          'knowledge-search',
        ]}
        title="组织应用"
      />,
    );

    expect(screen.getByRole('link', { name: '打开 pAI' })).toBeVisible();
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
