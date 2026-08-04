import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceAppPage from '.';

const { useLocationMock, useModelMock } = vi.hoisted(() => ({
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
    useLocation: useLocationMock,
    useModel: useModelMock,
  };
});

describe('WorkspaceAppPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useLocationMock.mockReset();
    useModelMock.mockReset();
    useModelMock.mockReturnValue({
      initialState: {
        currentUser: { userId: 'user-1', name: '测试用户' },
      },
    });
  });

  it('loads an implemented page from the Skill Registry', async () => {
    useLocationMock.mockReturnValue({
      pathname: '/workspace/platform/apps/file-review/queue',
    });

    render(<WorkspaceAppPage />);

    expect(
      await screen.findByRole('heading', { level: 1, name: '待审文件' }),
    ).toBeInTheDocument();
  });

  it('uses the placeholder when a registered Skill has no page component', () => {
    useLocationMock.mockReturnValue({
      pathname: '/workspace/platform/apps/document-summary/tasks',
    });

    render(<WorkspaceAppPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: '文档任务' }),
    ).toBeInTheDocument();
    expect(screen.getByText('文档任务页面待开发')).toBeInTheDocument();
  });

  it('loads the standalone pAI workbench from the Skill Registry', async () => {
    useLocationMock.mockReturnValue({
      pathname: '/workspace/platform/apps/platform-assistant/overview',
    });

    render(<WorkspaceAppPage />);

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'pAI' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('pAI 对话工作台')).toBeInTheDocument();
  });

  it('collapses and expands the pAI conversation sidebar', async () => {
    useLocationMock.mockReturnValue({
      pathname: '/workspace/platform/apps/platform-assistant/overview',
    });
    render(<WorkspaceAppPage />);

    await screen.findByLabelText('pAI 对话工作台', {}, { timeout: 3000 });
    const sidebar = screen.getByLabelText('会话列表');
    fireEvent.click(screen.getByRole('button', { name: '收起会话栏' }));

    expect(sidebar).toHaveClass('ant-layout-sider-collapsed');
    fireEvent.click(screen.getByRole('button', { name: '展开会话栏' }));
    expect(sidebar).not.toHaveClass('ant-layout-sider-collapsed');
  });

  it('renames a pAI conversation and persists the title', async () => {
    useLocationMock.mockReturnValue({
      pathname: '/workspace/platform/apps/platform-assistant/overview',
    });
    const { container } = render(<WorkspaceAppPage />);

    await screen.findByLabelText('pAI 对话工作台', {}, { timeout: 3000 });
    const menuTrigger = container.querySelector('.ant-conversations-menu-icon');
    expect(menuTrigger).toBeInTheDocument();
    fireEvent.click(menuTrigger as Element);
    fireEvent.click(await screen.findByText('重命名'));

    fireEvent.change(screen.getByLabelText('会话标题'), {
      target: { value: '合同审查' },
    });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(screen.getAllByText('合同审查')).toHaveLength(2);
    });
    await waitFor(() => {
      const storedState = JSON.parse(
        localStorage.getItem('pai:v1:user-1:platform') ?? '{}',
      );
      expect(storedState.conversations[0]).toMatchObject({
        label: '合同审查',
        isDraft: false,
      });
    });
  });
});
