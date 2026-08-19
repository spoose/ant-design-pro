import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceStatsPage from '.';

vi.mock('@umijs/max', () => ({
  useParams: () => ({ statsPageKey: 'requests' }),
}));

describe('WorkspaceStatsPage', () => {
  it('renders the placeholder for the current stats child page', () => {
    render(<WorkspaceStatsPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: '请求用量' }),
    ).toBeInTheDocument();
    expect(screen.getByText('统计')).toBeInTheDocument();
    expect(screen.queryByText('管理中心')).not.toBeInTheDocument();
    expect(screen.getByText('请求用量页面待开发')).toBeInTheDocument();
    expect(screen.getByText('stats / requests')).toBeInTheDocument();
  });
});
