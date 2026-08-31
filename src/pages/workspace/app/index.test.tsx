import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceAppPage from '.';

const { requestMock, useLocationMock, useModelMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  useLocationMock: vi.fn(),
  useModelMock: vi.fn(),
}));

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath,
    matchPath,
    request: requestMock,
    useLocation: useLocationMock,
    useModel: useModelMock,
  };
});

describe('WorkspaceAppPage', () => {
  beforeEach(() => {
    localStorage.clear();
    requestMock.mockReset();
    useLocationMock.mockReset();
    useModelMock.mockReset();
    useModelMock.mockReturnValue({
      initialState: {
        currentUser: { userId: 'user-1', name: '测试用户' },
      },
    });
    requestMock.mockImplementation(
      (
        url: string,
        options?: { method?: string; data?: { title?: string } },
      ) => {
        const conversation = {
          conversationId: 'conversation-1',
          ownerUserId: 'user-1',
          scope: { type: 'platform' },
          title: options?.data?.title ?? '新对话',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (url === '/api/pai/conversations' && options?.method === 'GET') {
          return Promise.resolve({
            success: true,
            data: [conversation],
            traceId: 'trace-list',
          });
        }
        if (
          url === '/api/pai/conversations/conversation-1' &&
          options?.method === 'GET'
        ) {
          return Promise.resolve({
            success: true,
            data: { conversation, turns: [] },
            traceId: 'trace-history',
          });
        }
        if (
          url === '/api/pai/conversations/conversation-1' &&
          options?.method === 'PATCH'
        ) {
          return Promise.resolve({
            success: true,
            data: conversation,
            traceId: 'trace-update',
          });
        }
        return Promise.reject(new Error(`Unexpected request: ${url}`));
      },
    );
  });

  it('loads an implemented page from the App Registry', async () => {
    useLocationMock.mockReturnValue({
      pathname: '/workspace/platform/apps/file-review/queue',
    });

    render(<WorkspaceAppPage />);

    expect(
      await screen.findByRole('heading', { level: 1, name: '待审文件' }),
    ).toBeInTheDocument();
  });

  it('uses the placeholder when a registered App has no page component', () => {
    useLocationMock.mockReturnValue({
      pathname: '/workspace/platform/apps/document-summary/tasks',
    });

    render(<WorkspaceAppPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: '文档任务' }),
    ).toBeInTheDocument();
    expect(screen.getByText('文档任务页面待开发')).toBeInTheDocument();
  });

  it('loads the standalone pAI workbench from the App Registry', async () => {
    useLocationMock.mockReturnValue({
      pathname: '/workspace/platform/apps/ai-assistant/overview',
    });

    render(<WorkspaceAppPage />);

    expect(
      await screen.findByRole('region', { name: 'pAI' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 1, name: 'pAI' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('pAI 对话工作台')).toBeInTheDocument();
  });

  it('uses placeholders for unfinished pAI navigation pages', () => {
    useLocationMock.mockReturnValue({
      pathname: '/workspace/platform/apps/ai-assistant/memory',
    });

    render(<WorkspaceAppPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: '记忆' }),
    ).toBeInTheDocument();
    expect(screen.getByText('记忆页面待开发')).toBeInTheDocument();
    expect(screen.queryByLabelText('pAI 对话工作台')).not.toBeInTheDocument();
  });

  it('collapses and expands the pAI conversation sidebar', async () => {
    useLocationMock.mockReturnValue({
      pathname: '/workspace/platform/apps/ai-assistant/overview',
    });
    render(<WorkspaceAppPage />);

    await screen.findByLabelText('pAI 对话工作台', {}, { timeout: 10_000 });
    const sidebar = screen.getByLabelText('会话列表');
    fireEvent.click(screen.getByRole('button', { name: '收起会话栏' }));

    expect(sidebar).toHaveClass('ant-layout-sider-collapsed');
    fireEvent.click(screen.getByRole('button', { name: '展开会话栏' }));
    expect(sidebar).not.toHaveClass('ant-layout-sider-collapsed');
  });

  it('renames a pAI conversation through the backend API', async () => {
    useLocationMock.mockReturnValue({
      pathname: '/workspace/platform/apps/ai-assistant/overview',
    });
    const { container } = render(<WorkspaceAppPage />);

    await screen.findByLabelText('pAI 对话工作台', {}, { timeout: 10_000 });
    const menuTrigger = await waitFor(() => {
      const trigger = container.querySelector('.ant-conversations-menu-icon');
      expect(trigger).toBeInTheDocument();
      return trigger;
    });
    fireEvent.click(menuTrigger as Element);
    fireEvent.click(await screen.findByText('重命名'));

    fireEvent.change(screen.getByLabelText('会话标题'), {
      target: { value: '合同审查' },
    });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(screen.getAllByText('合同审查')).toHaveLength(2);
    });
    expect(requestMock).toHaveBeenCalledWith(
      '/api/pai/conversations/conversation-1',
      { method: 'PATCH', data: { title: '合同审查' } },
    );
  });
});
