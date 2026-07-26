import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceAppPage from '.';

const { useLocationMock } = vi.hoisted(() => ({
  useLocationMock: vi.fn(),
}));

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return { generatePath, matchPath, useLocation: useLocationMock };
});

describe('WorkspaceAppPage', () => {
  beforeEach(() => {
    useLocationMock.mockReset();
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
});
