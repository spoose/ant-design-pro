import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { AccessContext } from '@/services/auth';
import { CurrentAccessOverview } from './CurrentAccessOverview';

vi.mock('@umijs/max', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('antd', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@ant-design/icons', () => {
  const Icon = () => <span data-testid="skill-icon" />;
  return {
    AuditOutlined: Icon,
    FileSearchOutlined: Icon,
    FileTextOutlined: Icon,
  };
});

const groupContext: AccessContext = {
  id: 'ctx-s1-g1',
  systemId: 'system-1',
  systemCode: 'SYS1',
  systemName: 'System 1',
  scopeType: 'department',
  scopeId: 'group-1',
  scopeName: 'Group 1',
  permissions: [
    'page:home',
    'page:dashboard-analysis',
    'page:dashboard-workplace',
    'page:ai-assistant',
  ],
  skillCodes: ['file-review', 'document-summary', 'knowledge-search'],
};

const systemContext: AccessContext = {
  id: 'ctx-s2',
  systemId: 'system-2',
  systemCode: 'SYS2',
  systemName: 'System 2',
  scopeType: 'system',
  permissions: [
    'page:home',
    'page:dashboard-analysis',
    'page:dashboard-monitor',
    'page:ai-assistant',
  ],
  skillCodes: ['file-review', 'knowledge-search'],
};

describe('CurrentAccessOverview', () => {
  it('updates permissions and filtered skills with the current context', () => {
    const { rerender } = render(
      <CurrentAccessOverview context={groupContext} />,
    );

    expect(screen.getByText('System 1')).toBeVisible();
    expect(screen.getByText('page:dashboard-workplace')).toBeVisible();
    expect(screen.getByText('文档总结')).toBeVisible();
    expect(screen.getByRole('link', { name: '打开 文件审查' })).toHaveAttribute(
      'href',
      '/chatbot?skill=file-review',
    );

    rerender(<CurrentAccessOverview context={systemContext} />);

    expect(screen.getByText('System 2')).toBeVisible();
    expect(
      screen.queryByText('page:dashboard-workplace'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('文档总结')).not.toBeInTheDocument();
    expect(screen.getByText('知识检索')).toBeVisible();
  });
});
