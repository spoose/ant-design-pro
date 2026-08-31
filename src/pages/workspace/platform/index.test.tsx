import { fireEvent, render, screen, within } from '@testing-library/react';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatPlatformWelcomeDate,
  getPlatformWelcomeHeading,
  PlatformOverview,
} from '.';
import { getMockScheduleForDate } from './overview/mockSchedule';
import { PlatformWelcomeAvatar } from './overview/PlatformWelcomeAvatar';

vi.mock('@bible-strong/avatar-react', () => ({
  createAvatar: () => {
    const MockStrobiAvatar = () => <div data-testid="strobi-avatar" />;
    return MockStrobiAvatar;
  },
}));

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
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  const MockListItem = ({ children }: { children?: ReactNode }) => (
    <li>{children}</li>
  );
  MockListItem.Meta = ({
    title,
    description,
  }: {
    title?: ReactNode;
    description?: ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  );

  return {
    ...actual,
    Calendar: ({
      value,
      onSelect,
    }: {
      value?: { format: (pattern: string) => string };
      onSelect?: (value: { format: (pattern: string) => string }) => void;
    }) => (
      <div data-testid="platform-calendar">
        <button
          type="button"
          onClick={() =>
            onSelect?.(value ?? { format: () => dayjs().format('YYYY-MM-DD') })
          }
        >
          切换日期
        </button>
      </div>
    ),
    List: Object.assign(
      ({
        dataSource = [],
        renderItem,
      }: {
        dataSource?: Record<string, unknown>[];
        renderItem?: (item: Record<string, unknown>) => ReactNode;
      }) => (
        <ul>
          {dataSource.map((item) => (
            <div key={String(item.key)}>{renderItem?.(item)}</div>
          ))}
        </ul>
      ),
      { Item: MockListItem },
    ),
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
  };
});

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

vi.mock('liveline', () => ({
  Liveline: () => <div data-testid="platform-liveline-chart" />,
}));

describe('formatPlatformWelcomeDate', () => {
  it('formats weekday labels in Chinese', () => {
    expect(formatPlatformWelcomeDate(new Date(2026, 7, 18))).toBe(
      '8月18日 · 星期二',
    );
  });
});

describe('getPlatformWelcomeHeading', () => {
  it('builds the workbench header copy from currentUser', () => {
    expect(
      getPlatformWelcomeHeading({
        isSuperAdmin: true,
        userName: '张三',
        date: new Date(2026, 7, 18),
      }),
    ).toEqual({
      title: '你好，张三',
      description: '8月18日 · 星期二 · 项目管理员',
    });
  });

  it('labels a non-admin visitor as a regular user', () => {
    expect(
      getPlatformWelcomeHeading({
        userName: '李四',
        date: new Date(2026, 7, 18),
      }),
    ).toEqual({
      title: '你好，李四',
      description: '8月18日 · 星期二 · 普通用户',
    });
  });
});

describe('getMockScheduleForDate', () => {
  it('returns mock items for the matching day only', () => {
    const today = dayjs();
    expect(getMockScheduleForDate(today).map(({ title }) => title)).toEqual([
      '用量周报',
      '权限变更复核',
    ]);
    expect(getMockScheduleForDate(today.add(1, 'day'))).toEqual([]);
    expect(
      getMockScheduleForDate(today.add(3, 'day')).map(({ title }) => title),
    ).toEqual(['系统维护窗口']);
  });
});

describe('PlatformWelcomeAvatar', () => {
  it('links to account settings with the resolved avatar', () => {
    render(
      <PlatformWelcomeAvatar
        avatar="https://example.com/avatar.png"
        userName="张三"
      />,
    );

    expect(
      screen.getByRole('link', { name: '张三 的个人设置' }),
    ).toHaveAttribute('href', '/account/settings');
    expect(screen.getByRole('img', { name: '张三 的头像' })).toHaveAttribute(
      'src',
      'https://example.com/avatar.png',
    );
  });
});

describe('PlatformOverview', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });
  it('renders the mock chart and calendar widgets on the workbench', () => {
    render(<PlatformOverview appCodes={[]} />);

    expect(screen.getByRole('heading', { name: 'AI 数据洞悉' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '问问小One' })).toBeVisible();
    expect(screen.getByPlaceholderText('问问权限、用量或成员…')).toBeVisible();
    expect(
      screen.queryByRole('link', { name: '新对话' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('查找特定用户')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: '你可以这样提问' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: '最近' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('知识库检索失败')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '快速入口' })).toBeVisible();
    expect(screen.getByRole('link', { name: '个人设置' })).toHaveAttribute(
      'href',
      '/account/settings',
    );
    expect(
      screen.queryByRole('link', { name: '打开 xOneAI' }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('platform-mock-chart')).toBeVisible();
    expect(screen.getByText('输入 Token')).toBeVisible();
    expect(screen.getByText('输出 Token')).toBeVisible();
    expect(
      screen.queryByRole('link', { name: '是否改用更经济的模型？' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Snapshot')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '下一条用量洞察' }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: '日程' })).toBeVisible();
    expect(screen.getByTestId('platform-calendar')).toBeVisible();
    expect(
      screen.getByRole('region', { name: '问问小One' }).parentElement
        ?.className,
    ).toContain('lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]');
    expect(
      screen.getByRole('region', { name: '问问小One' }).parentElement
        ?.className,
    ).toContain('lg:h-[min(22rem,_calc(100dvh-56px-21rem))]');
    expect(screen.getByTestId('platform-calendar-grid').className).toContain(
      'overflow-y-auto',
    );
    expect(screen.getByRole('button', { name: '今日安排' })).toBeVisible();
    expect(screen.queryByText('用量周报')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '今日安排' }));
    expect(screen.getByText('用量周报')).toBeVisible();
    expect(screen.getByText('10:00')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '收起' }));
    expect(screen.queryByText('用量周报')).not.toBeInTheDocument();
  });

  it('links Project apps without adding management cards to the home', () => {
    render(<PlatformOverview appCodes={['file-review']} />);

    expect(screen.getByRole('link', { name: '打开 文件审查' })).toHaveAttribute(
      'href',
      '/workspace/platform/apps/file-review/overview',
    );
    expect(
      screen.getByText('从空白开始，或让助手引导你完成审查。'),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: '组织工作区' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '项目权限' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the shared application empty state', () => {
    render(<PlatformOverview appCodes={[]} />);

    expect(screen.getByRole('link', { name: '个人设置' })).toBeVisible();
    expect(
      screen.getByText('当前账号暂无项目应用，请联系项目管理员授权。'),
    ).toBeVisible();
  });

  it('passes platform apps into the shared launch strip', () => {
    render(
      <PlatformOverview
        appCodes={[
          'ai-assistant',
          'file-review',
          'document-summary',
          'knowledge-search',
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: '项目应用' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '全部应用' })).toBeVisible();
    expect(screen.getByRole('link', { name: '知识检索' })).toHaveAttribute(
      'href',
      '/workspace/platform/apps/knowledge-search/overview',
    );
    const appList = screen
      .getByRole('heading', { name: '项目应用' })
      .closest('section');
    expect(appList).not.toBeNull();
    fireEvent.click(
      within(appList as HTMLElement).getByRole('button', {
        name: '更多，还有 1 个应用',
      }),
    );
    expect(screen.getByRole('link', { name: '打开 知识检索' })).toHaveAttribute(
      'href',
      '/workspace/platform/apps/knowledge-search/overview',
    );
  });
});
