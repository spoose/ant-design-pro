import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SelectEntry from './index';
import { queryLoginEntries, selectLoginEntry } from './service';

const mockSetInitialState = vi.fn();

vi.mock('@umijs/max', () => ({
  Helmet: ({ children }: any) => children,
  SelectLang: () => null,
  useModel: () => ({
    setInitialState: mockSetInitialState,
  }),
}));

vi.mock('@/components', () => ({
  Footer: () => null,
}));

vi.mock('./service', () => ({
  queryLoginEntries: vi.fn(),
  selectLoginEntry: vi.fn(),
}));

describe('SelectEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/user/select-entry');
  });

  it('should load entries and submit selected entry', async () => {
    vi.mocked(queryLoginEntries).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'new-system-department',
          name: '新业务部门',
          type: 'system',
          systemName: 'New System',
          entryUrl: 'https://b.domain1',
        },
      ],
    });
    vi.mocked(selectLoginEntry).mockResolvedValue({
      success: true,
      data: {
        id: 'new-system-department',
        name: '新业务部门',
        type: 'system',
        systemName: 'New System',
        entryUrl: 'https://b.domain1',
      },
    });

    render(<SelectEntry />);

    await screen.findByText('新业务部门');
    fireEvent.click(screen.getByLabelText(/新业务部门/));
    fireEvent.click(screen.getByRole('button', { name: '进入首页' }));

    await waitFor(() => {
      expect(selectLoginEntry).toHaveBeenCalledWith('new-system-department');
    });
    expect(mockSetInitialState).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should show load errors directly', async () => {
    vi.mocked(queryLoginEntries).mockRejectedValue(new Error('entries failed'));

    render(<SelectEntry />);

    expect(await screen.findByText('entries failed')).toBeInTheDocument();
  });

  it('should keep submit disabled when entry list is empty', async () => {
    vi.mocked(queryLoginEntries).mockResolvedValue({
      success: true,
      data: [],
    });

    render(<SelectEntry />);

    expect(await screen.findByText('暂无可选登录入口')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '进入首页' })).toBeDisabled();
  });
});
