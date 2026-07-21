import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SkillPlaceholderPage from '.';

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
