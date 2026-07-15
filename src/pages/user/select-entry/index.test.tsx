import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessContext } from '@/services/auth';
import SelectEntry from './index';
import { setDefaultContext } from './service';

const testState = vi.hoisted(() => ({
  initialState: {
    currentUser: {
      name: 'Test User',
      contexts: [] as AccessContext[],
      defaultContextId: undefined as string | undefined,
    },
    currentContextId: undefined as string | undefined,
  },
  setInitialState: vi.fn(),
  replace: vi.fn(),
  setCurrentContextId: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  Helmet: ({ children }: any) => children,
  history: { replace: testState.replace },
  SelectLang: () => null,
  useModel: () => ({
    initialState: testState.initialState,
    setInitialState: testState.setInitialState,
  }),
}));

vi.mock('@/components', () => ({
  Footer: () => null,
}));

vi.mock('./service', () => ({
  setDefaultContext: vi.fn(),
}));

vi.mock('@/utils/currentContext', () => ({
  setCurrentContextId: testState.setCurrentContextId,
}));

const context: AccessContext = {
  id: 'ctx-s2',
  systemId: 'system-2',
  systemCode: 'SYS2',
  systemName: 'System 2',
  scopeType: 'system',
  permissions: ['page:home', 'page:dashboard-analysis'],
  skillCodes: ['file-review'],
};

describe('SelectEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.initialState.currentUser.contexts = [context];
    testState.initialState.currentUser.defaultContextId = undefined;
    testState.initialState.currentContextId = undefined;
    window.history.pushState({}, '', '/user/select-entry');
  });

  it('should set the selected context as the default and enter the home page', async () => {
    vi.mocked(setDefaultContext).mockResolvedValue({
      success: true,
      data: { defaultContextId: context.id },
    });

    render(<SelectEntry />);

    fireEvent.click(screen.getByLabelText(/System 2/));
    fireEvent.click(screen.getByRole('button', { name: '进入首页' }));

    await waitFor(() => {
      expect(setDefaultContext).toHaveBeenCalledWith(context.id);
    });
    expect(testState.setCurrentContextId).toHaveBeenCalledWith(context.id);
    expect(testState.setInitialState).toHaveBeenCalledWith(
      expect.any(Function),
    );
    expect(testState.replace).toHaveBeenCalledWith('/home');

    const updateState = testState.setInitialState.mock.calls[0][0];
    const updatedState = updateState(testState.initialState);
    expect(updatedState.currentContextId).toBe(context.id);
    expect(updatedState.currentUser.defaultContextId).toBe(context.id);
  });

  it('should show default context API errors directly', async () => {
    vi.mocked(setDefaultContext).mockRejectedValue(
      new Error('设置默认系统失败'),
    );

    render(<SelectEntry />);

    fireEvent.click(screen.getByLabelText(/System 2/));
    fireEvent.click(screen.getByRole('button', { name: '进入首页' }));

    expect(await screen.findByText('设置默认系统失败')).toBeInTheDocument();
  });

  it('should keep submit disabled when context list is empty', () => {
    testState.initialState.currentUser.contexts = [];

    render(<SelectEntry />);

    expect(screen.getByText('暂无可选登录入口')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '进入首页' })).toBeDisabled();
  });
});
