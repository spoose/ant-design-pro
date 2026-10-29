import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OCTOP_BASE_URL } from '@/config/externalApps';
import { XoneAuthBackendError } from '@/services/auth-backends/xone';
import PlatformAppCatalog from './PlatformAppCatalog';

const { getOctopLaunchUrlMock, messageError, handleAuthFailureMock } =
  vi.hoisted(() => ({
    getOctopLaunchUrlMock: vi.fn(),
    messageError: vi.fn(),
    handleAuthFailureMock: vi.fn(),
  }));

vi.mock('./service', () => ({ getOctopLaunchUrl: getOctopLaunchUrlMock }));
vi.mock('antd', () => ({
  App: { useApp: () => ({ message: { error: messageError } }) },
}));
vi.mock('@/utils/authFailure', () => ({
  handleAccessTokenFailure: handleAuthFailureMock,
}));

vi.mock('@umijs/max', async () => ({
  ...(await vi.importActual('react-router-dom')),
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe('PlatformAppCatalog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getOctopLaunchUrlMock.mockReset();
    messageError.mockReset();
    handleAuthFailureMock.mockReset().mockReturnValue(false);
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
        getAppPath={(appCode) => `/apps/${appCode}`}
        appCodes={['file-review', 'knowledge-search', 'ai-assistant']}
      />,
    );

    expect(screen.getByRole('heading', { name: '全部应用' })).toBeVisible();
    const xiaoOne = screen.getByRole('button', { name: '小One' });
    expect(xiaoOne).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'AI助手' }).nextElementSibling,
    ).toBe(xiaoOne);
    expect(screen.getByRole('link', { name: 'AI助手' })).toHaveAttribute(
      'href',
      OCTOP_BASE_URL,
    );
    expect(screen.getByRole('link', { name: 'AI助手' })).toHaveAttribute(
      'target',
      '_blank',
    );
    expect(
      screen.getByRole('link', { name: 'AI助手' }).querySelector('img'),
    ).toHaveAttribute('src', '/assets/icons/app-catalog/chatbot.png');
    expect(screen.getByRole('link', { name: '文件审查' })).toBeVisible();
    expect(screen.getByRole('link', { name: '知识检索' })).toBeVisible();
    expect(screen.getByRole('link', { name: '会议纪要' })).toBeVisible();
    expect(screen.getByRole('link', { name: '数据看板' })).toBeVisible();
    expect(screen.getByRole('link', { name: '流程审批' })).toBeVisible();
    expect(screen.getByRole('link', { name: '通知中心' })).toBeVisible();
    expect(
      screen.queryByRole('link', { name: '工单中心' }),
    ).not.toBeInTheDocument();
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
        getAppPath={(appCode) => `/apps/${appCode}`}
        appCodes={['ai-assistant', 'file-review']}
      />,
    );

    expect(screen.getByRole('link', { name: 'AI助手' })).toBeVisible();
    expect(screen.getByRole('link', { name: '文件审查' })).toBeVisible();
    expect(screen.getByRole('link', { name: '会议纪要' })).toBeVisible();
    expect(screen.getByRole('button', { name: '小One' })).toBeVisible();
    expect(
      screen.queryByRole('link', { name: '数据看板' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '流程审批' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '展开其余 4 个应用' }));
    expect(screen.getByRole('link', { name: '流程审批' })).toBeVisible();
    expect(screen.getByRole('link', { name: '通知中心' })).toBeVisible();
    expect(screen.getByRole('link', { name: '工单中心' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '收起' }));
    expect(
      screen.queryByRole('link', { name: '流程审批' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the extra app entries when no apps are authorized', () => {
    render(
      <PlatformAppCatalog
        emptyDescription="暂无授权应用。"
        getAppPath={(appCode) => `/apps/${appCode}`}
        appCodes={[]}
      />,
    );

    expect(screen.getByText('5 项')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: '小One' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '会议纪要' })).toBeVisible();
    expect(screen.queryByText('暂无授权应用。')).not.toBeInTheDocument();
  });

  it('caps desktop preview at eight apps and expands in place', () => {
    render(
      <PlatformAppCatalog
        getAppPath={(appCode) => `/apps/${appCode}`}
        appCodes={[
          'ai-assistant',
          'file-review',
          'document-summary',
          'knowledge-search',
        ]}
      />,
    );

    expect(screen.getByText('10 项')).toBeVisible();
    expect(screen.getByRole('link', { name: '流程审批' })).toBeVisible();
    expect(
      screen.queryByRole('link', { name: '通知中心' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '工单中心' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '展开其余 2 个应用' }));
    expect(screen.getByRole('link', { name: '工单中心' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '收起' }));
    expect(
      screen.queryByRole('link', { name: '工单中心' }),
    ).not.toBeInTheDocument();
  });

  it('opens a tab synchronously, prevents duplicate launches, then navigates with the ticket', async () => {
    let resolveLaunch!: (url: string) => void;
    getOctopLaunchUrlMock.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveLaunch = resolve;
        }),
    );
    const popup = {
      opener: {},
      closed: false,
      location: { replace: vi.fn() },
      close: vi.fn(),
    };
    const open = vi
      .spyOn(window, 'open')
      .mockReturnValue(popup as unknown as Window);
    render(
      <PlatformAppCatalog
        appCodes={['ai-assistant']}
        getAppPath={(code) => `/apps/${code}`}
      />,
    );

    const button = screen.getByRole('button', { name: '小One' });
    fireEvent.click(button);
    expect(open).toHaveBeenCalledWith('about:blank', '_blank');
    expect(popup.opener).toBeNull();
    expect(button).toBeDisabled();
    expect(screen.getByText('正在打开 Octop…')).toBeVisible();
    fireEvent.click(button);
    expect(getOctopLaunchUrlMock).toHaveBeenCalledTimes(1);
    expect(popup.location.replace).not.toHaveBeenCalled();

    const url = 'http://xone.test/web/ai/octop/launch?ticket=test-ticket';
    resolveLaunch(url);
    await waitFor(() =>
      expect(popup.location.replace).toHaveBeenCalledWith(url),
    );
    expect(button).toBeEnabled();
    expect(popup.close).not.toHaveBeenCalled();
  });

  it('closes the blank tab and reports a ticket failure without navigating', async () => {
    const error = new Error('组织未接入');
    getOctopLaunchUrlMock.mockRejectedValue(error);
    const popup = {
      opener: {},
      closed: false,
      location: { replace: vi.fn() },
      close: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    render(
      <PlatformAppCatalog
        appCodes={['ai-assistant']}
        getAppPath={(code) => `/apps/${code}`}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '小One' }));
    await waitFor(() =>
      expect(messageError).toHaveBeenCalledWith('组织未接入'),
    );
    expect(popup.close).toHaveBeenCalledTimes(1);
    expect(popup.location.replace).not.toHaveBeenCalled();
    expect(handleAuthFailureMock).toHaveBeenCalledWith(error);
    expect(screen.getByRole('button', { name: '小One' })).toBeEnabled();
  });

  it('does not request a ticket when popups are blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    render(
      <PlatformAppCatalog
        appCodes={['ai-assistant']}
        getAppPath={(code) => `/apps/${code}`}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '小One' }));
    expect(getOctopLaunchUrlMock).not.toHaveBeenCalled();
    expect(messageError).toHaveBeenCalledWith('请允许浏览器打开新标签页后重试');
  });

  it('uses the shared session failure handler when authentication expires', async () => {
    const error = { name: 'XoneAuthBackendError', code: 401 };
    getOctopLaunchUrlMock.mockRejectedValue(error);
    handleAuthFailureMock.mockReturnValue(true);
    const popup = { opener: {}, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    render(
      <PlatformAppCatalog
        appCodes={['ai-assistant']}
        getAppPath={(code) => `/apps/${code}`}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '小One' }));
    await waitFor(() =>
      expect(handleAuthFailureMock).toHaveBeenCalledWith(error),
    );
    expect(popup.close).toHaveBeenCalledTimes(1);
    expect(messageError).not.toHaveBeenCalled();
  });

  it('prompts for an organization on 602001 without falling back to Octop', async () => {
    getOctopLaunchUrlMock.mockRejectedValue(
      new XoneAuthBackendError('获取免登票据', {
        code: 602001,
        msg: '未选择组织',
      }),
    );
    const popup = {
      opener: {},
      closed: false,
      location: { replace: vi.fn() },
      close: vi.fn(),
    };
    const open = vi
      .spyOn(window, 'open')
      .mockReturnValue(popup as unknown as Window);
    render(
      <PlatformAppCatalog
        appCodes={['ai-assistant']}
        getAppPath={(code) => `/apps/${code}`}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '小One' }));
    await waitFor(() =>
      expect(messageError).toHaveBeenCalledWith(
        '请先切换到具体组织，再使用 SSO 登录',
      ),
    );
    expect(popup.close).toHaveBeenCalledOnce();
    expect(popup.location.replace).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '小One' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'AI助手' })).toHaveAttribute(
      'href',
      OCTOP_BASE_URL,
    );
  });

  it('does not navigate a popup the user closed while waiting', async () => {
    getOctopLaunchUrlMock.mockResolvedValue(
      'http://xone.test/web/ai/octop/launch?ticket=test-ticket',
    );
    const popup = {
      opener: {},
      closed: true,
      location: { replace: vi.fn() },
      close: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    render(
      <PlatformAppCatalog
        appCodes={['ai-assistant']}
        getAppPath={(code) => `/apps/${code}`}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '小One' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '小One' })).toBeEnabled(),
    );
    expect(popup.location.replace).not.toHaveBeenCalled();
  });
});
