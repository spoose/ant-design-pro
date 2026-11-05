import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WujieReact from 'wujie-react';
import { OCTOP_STATUS_EVENT } from '@/utils/octopBridge';
import { getOctopInstanceName } from '@/utils/octopRuntime';
import { resolveWorkspaceScopeFromPath } from '@/utils/workspaceRoutes';
import { WorkspaceHomeModules } from './WorkspaceHomeModules';

/** 与 octop 页相同的推导：pathname → Scope → 实例名。 */
const instanceNameFor = (path: string) =>
  getOctopInstanceName('user-1', resolveWorkspaceScopeFromPath(path));

const testState = vi.hoisted(() => ({
  userId: 'user-1' as string | undefined,
  navigate: vi.fn(),
}));

vi.mock('@bible-strong/avatar-react', () => ({
  createAvatar: () => {
    const MockStrobiAvatar = () => <div data-testid="strobi-avatar" />;
    return MockStrobiAvatar;
  },
}));

vi.mock('@ant-design/x', () => ({
  Prompts: ({
    items,
    onItemClick,
  }: {
    items: { key: string; label: ReactNode }[];
    onItemClick?: (info: { data: { key: string; label: ReactNode } }) => void;
  }) => (
    <div>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onItemClick?.({ data: item })}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
  Sender: ({
    onSubmit,
    placeholder,
    disabled,
  }: {
    onSubmit?: (message: string) => void;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.('按 Scope 提问');
      }}
    >
      <input disabled={disabled} placeholder={placeholder} />
      <button type="submit">发送</button>
    </form>
  ),
}));

vi.mock('@umijs/max', async () => {
  const router =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath: router.generatePath,
    matchPath: router.matchPath,
    useModel: () => ({
      initialState: { currentUser: { userId: testState.userId } },
    }),
    useNavigate: () => testState.navigate,
    useParams: () => ({}),
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
  };
});

beforeEach(() => {
  testState.userId = 'user-1';
  testState.navigate.mockClear();
});

const PROJECT_OCTOP = '/workspace/platform/apps/octop/overview';
const ORG_OCTOP = '/workspace/org/org-1/apps/octop/overview';

const renderModules = (getAppPath: (appCode: string) => string) =>
  render(
    <WorkspaceHomeModules
      appCodes={[]}
      appTitle="测试应用"
      emptyDescription="暂无应用"
      getAppPath={getAppPath}
    />,
  );

describe('WorkspaceHomeModules', () => {
  it('distinguishes Octop startup, login and service status on the home card', () => {
    renderModules((appCode) => `/workspace/platform/apps/${appCode}/overview`);
    expect(screen.getByText('待打开')).toBeVisible();

    act(() => WujieReact.bus.$emit(OCTOP_STATUS_EVENT, { status: 'checking' }));
    expect(screen.getByText('正在确认登录')).toBeVisible();

    act(() =>
      WujieReact.bus.$emit(OCTOP_STATUS_EVENT, { status: 'unauthenticated' }),
    );
    expect(screen.getByText('未登录')).toBeVisible();
    expect(screen.getByRole('button', { name: /去\s*登\s*录/ })).toBeVisible();
    expect(screen.getByPlaceholderText('登录后可提问')).toBeDisabled();

    act(() => WujieReact.bus.$emit(OCTOP_STATUS_EVENT, { status: 'offline' }));
    expect(screen.getByText('服务不可用')).toBeVisible();
    expect(screen.getByRole('button', { name: /打开 Octop/ })).toBeVisible();

    act(() =>
      WujieReact.bus.$emit(OCTOP_STATUS_EVENT, { status: 'authenticated' }),
    );
    expect(screen.getByText('已登录')).toBeVisible();
    expect(screen.getByPlaceholderText('问问知识库助手…')).toBeEnabled();
  });

  it('shows the Octop conversation card in the Project scope', () => {
    renderModules((appCode) => `/workspace/platform/apps/${appCode}/overview`);
    expect(
      screen.getByRole('region', { name: '问问知识库助手' }),
    ).toBeVisible();
  });

  it('shows the Octop conversation card in the Organization scope', () => {
    renderModules((appCode) => `/workspace/org/org-1/apps/${appCode}/overview`);
    expect(
      screen.getByRole('region', { name: '问问知识库助手' }),
    ).toBeVisible();
  });

  it('keeps the legacy 小One card mounted but hidden', () => {
    renderModules((appCode) => `/workspace/platform/apps/${appCode}/overview`);
    expect(screen.queryByRole('heading', { name: '问问小One' })).toBeNull();
    const hiddenHeading = screen.getByText('问问小One', { selector: 'h2' });
    expect(hiddenHeading.closest('[hidden]')).not.toBeNull();
  });

  it('navigates a Project prompt to the Project Octop page', () => {
    renderModules((appCode) =>
      appCode === 'octop'
        ? PROJECT_OCTOP
        : `/workspace/platform/apps/${appCode}/overview`,
    );
    fireEvent.click(screen.getByRole('button', { name: '介绍一下聚数公司' }));
    expect(testState.navigate).toHaveBeenCalledWith(PROJECT_OCTOP, {
      state: { prompt: '介绍一下聚数公司' },
    });
  });

  it('navigates an Organization prompt to the current organization Octop page', () => {
    renderModules((appCode) =>
      appCode === 'octop'
        ? ORG_OCTOP
        : `/workspace/org/org-1/apps/${appCode}/overview`,
    );
    fireEvent.click(screen.getByRole('button', { name: '介绍一下聚数公司' }));
    expect(testState.navigate).toHaveBeenCalledWith(ORG_OCTOP, {
      state: { prompt: '介绍一下聚数公司' },
    });
  });

  it('card navigation target resolves to the same Octop instance as the page pathname', () => {
    renderModules((appCode) =>
      appCode === 'octop'
        ? ORG_OCTOP
        : `/workspace/org/org-1/apps/${appCode}/overview`,
    );
    fireEvent.click(screen.getByRole('button', { name: '介绍一下聚数公司' }));
    // 卡片导航到的路径即 octop 页接收到的 pathname，两侧必须得出同一实例名。
    const navigatedTo = testState.navigate.mock.calls[0][0] as string;
    expect(navigatedTo).toBe(ORG_OCTOP);
    expect(instanceNameFor(navigatedTo)).toBe(instanceNameFor(ORG_OCTOP));
    expect(instanceNameFor(navigatedTo)).not.toBe(
      instanceNameFor(PROJECT_OCTOP),
    );
    expect(instanceNameFor(navigatedTo)).toContain('organization:org-1');
  });

  it('navigates the Organization composer submit to the organization Octop page', () => {
    renderModules((appCode) =>
      appCode === 'octop'
        ? ORG_OCTOP
        : `/workspace/org/org-1/apps/${appCode}/overview`,
    );
    fireEvent.click(screen.getByRole('button', { name: '发送' }));
    expect(testState.navigate).toHaveBeenCalledWith(ORG_OCTOP, {
      state: { prompt: '按 Scope 提问' },
    });
  });
});
