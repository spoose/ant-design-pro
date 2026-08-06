import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PlatformOverview } from '.';

vi.mock('@umijs/max', () => ({
  generatePath: (pattern: string, params: Record<string, string | undefined>) =>
    Object.entries(params).reduce(
      (path, [key, value]) => path.replace(`:${key}`, value ?? ''),
      pattern,
    ),
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  matchPath: () => undefined,
  useModel: () => ({ initialState: undefined }),
  useParams: () => ({}),
}));

vi.mock('antd', () => ({
  Table: ({
    columns = [],
    dataSource = [],
    locale,
  }: {
    columns?: {
      dataIndex?: string;
      key?: string;
      render?: (value: unknown, record: Record<string, unknown>) => ReactNode;
    }[];
    dataSource?: Record<string, unknown>[];
    locale?: { emptyText?: ReactNode };
  }) =>
    dataSource.length ? (
      <div>
        {dataSource.map((record) => (
          <div key={String(record.key)}>
            {columns.map((column, index) => (
              <div key={column.key ?? column.dataIndex ?? index}>
                {column.render
                  ? column.render(
                      column.dataIndex ? record[column.dataIndex] : undefined,
                      record,
                    )
                  : column.dataIndex
                    ? String(record[column.dataIndex] ?? '')
                    : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    ) : (
      <div>{locale?.emptyText}</div>
    ),
  Tag: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@ant-design/icons', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ant-design/icons')>();
  const Icon = () => <span data-testid="platform-icon" />;
  return {
    ...actual,
    BankOutlined: Icon,
    RightOutlined: Icon,
  };
});

vi.mock('./organizations', () => ({ default: () => null }));
vi.mock('./users', () => ({ default: () => null }));

describe('PlatformOverview', () => {
  it('prioritizes the organization workspace and links real platform apps', () => {
    render(
      <PlatformOverview
        organizationRows={[
          {
            key: 'organization-1',
            code: 'ORG_ONE',
            name: '组织一',
            organizationId: 'organization-1',
          },
        ]}
        permissions={['platform:*']}
        skillCodes={['file-review']}
      />,
    );

    expect(screen.getByRole('heading', { name: '组织工作区' })).toBeVisible();
    expect(screen.getByText('组织一')).toBeVisible();
    expect(screen.getByRole('link', { name: '进入 组织一' })).toHaveAttribute(
      'href',
      '/workspace/org/organization-1/home',
    );
    expect(screen.getByRole('link', { name: '打开 文件审查' })).toHaveAttribute(
      'href',
      '/workspace/platform/apps/file-review/overview',
    );
    expect(
      screen.getByText('从空白开始，或让助手引导你完成审查。'),
    ).toBeVisible();
    expect(screen.getByText('platform:*')).toBeVisible();
    expect(screen.queryByText('角色模板')).not.toBeInTheDocument();
  });

  it('keeps empty states inside their corresponding widgets', () => {
    render(
      <PlatformOverview
        organizationRows={[]}
        permissions={[]}
        skillCodes={[]}
      />,
    );

    expect(screen.getByText('当前账号暂无可进入组织')).toBeVisible();
    expect(
      screen.getByText('当前账号暂无平台应用，请联系平台管理员授权。'),
    ).toBeVisible();
    expect(screen.getByText('当前账号暂无平台权限。')).toBeVisible();
  });

  it('passes platform skills into the shared launch strip', () => {
    render(
      <PlatformOverview
        organizationRows={[]}
        permissions={[]}
        skillCodes={[
          'ai-assistant',
          'file-review',
          'document-summary',
          'knowledge-search',
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: '平台应用' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: '更多，还有 1 个应用' }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: '更多，还有 1 个应用' }),
    );
    expect(screen.getByRole('link', { name: '打开 知识检索' })).toHaveAttribute(
      'href',
      '/workspace/platform/apps/knowledge-search/overview',
    );
  });
});
