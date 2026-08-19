import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SkillPlaceholderPage from '.';

vi.mock('@umijs/max', async () => {
  const { generatePath, matchPath } =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath,
    matchPath,
    useLocation: () => ({
      pathname: '/workspace/platform/apps/knowledge-search/history',
    }),
    useModel: () => ({ initialState: undefined }),
  };
});

describe('SkillPlaceholderPage', () => {
  it('uses the registered Skill and child-page titles', () => {
    render(
      <SkillPlaceholderPage appKey="knowledge-search" pageKey="history" />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: '搜索记录' }),
    ).toBeInTheDocument();
    expect(screen.getByText('搜索记录页面待开发')).toBeInTheDocument();
    expect(screen.getByText('knowledge-search / history')).toBeInTheDocument();
  });
});
