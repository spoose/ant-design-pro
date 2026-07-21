import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceSkillList from '.';

vi.mock('@umijs/max', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('antd', () => {
  const Empty = ({ description }: any) => <div>{description}</div>;
  Empty.PRESENTED_IMAGE_SIMPLE = 'simple';
  return {
    Card: ({ children }: any) => <div>{children}</div>,
    Empty,
  };
});

vi.mock('@ant-design/icons', () => {
  const Icon = () => <span data-testid="skill-icon" />;
  return {
    AuditOutlined: Icon,
    DatabaseOutlined: Icon,
    FileDoneOutlined: Icon,
    FileSearchOutlined: Icon,
    FileTextOutlined: Icon,
    HistoryOutlined: Icon,
    InboxOutlined: Icon,
    SearchOutlined: Icon,
  };
});

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
});
