import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { OrganizationAccess } from '@/services/auth';
import { CurrentAccessOverview } from './CurrentAccessOverview';

vi.mock('@umijs/max', async () => {
  const { generatePath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath,
    Link: ({ children, to, ...props }: any) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

vi.mock('antd', () => ({
  Table: () => null,
  Tag: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@ant-design/icons', () => {
  const Icon = () => <span data-testid="skill-icon" />;
  return {
    AuditOutlined: Icon,
    DatabaseOutlined: Icon,
    FileDoneOutlined: Icon,
    FileSearchOutlined: Icon,
    FileTextOutlined: Icon,
    FolderOutlined: Icon,
    HistoryOutlined: Icon,
    InboxOutlined: Icon,
    OllamaFilled: Icon,
    RobotOutlined: Icon,
    SearchOutlined: Icon,
  };
});

const organizationOne: OrganizationAccess = {
  organizationId: 'organization-1',
  organizationCode: 'ORG1',
  organizationName: '组织一',
  permissions: ['page:dashboard-workplace'],
  skillCodes: ['file-review', 'document-summary'],
  dataScopes: [],
  defaultDataScopeId: null,
};
const organizationTwo: OrganizationAccess = {
  organizationId: 'organization-2',
  organizationCode: 'ORG2',
  organizationName: '组织二',
  permissions: ['page:dashboard-monitor'],
  skillCodes: ['knowledge-search'],
  dataScopes: [],
  defaultDataScopeId: null,
};

describe('CurrentAccessOverview', () => {
  it('updates permissions and Skills with the current Organization', () => {
    const { rerender } = render(
      <CurrentAccessOverview organization={organizationOne} />,
    );
    expect(screen.getByText('组织一')).toBeVisible();
    expect(screen.getByText('page:dashboard-workplace')).toBeVisible();
    expect(screen.getByText('文档总结')).toBeVisible();
    expect(screen.getByRole('link', { name: '打开 文件审查' })).toHaveAttribute(
      'href',
      '/workspace/org/organization-1/apps/file-review/overview',
    );

    rerender(<CurrentAccessOverview organization={organizationTwo} />);
    expect(screen.getByText('组织二')).toBeVisible();
    expect(screen.queryByText('文档总结')).not.toBeInTheDocument();
    expect(screen.getByText('知识检索')).toBeVisible();
  });
});
