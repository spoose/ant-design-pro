import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SysSwitch } from './SysSwitch';

const testState = vi.hoisted(() => {
  const currentContext = {
    id: 'ctx-s1-g1',
    systemId: 'system-1',
    systemCode: 'SYS1',
    systemName: 'System 1',
    scopeType: 'department' as const,
    scopeId: 'group-1',
    scopeName: 'Group 1',
    permissions: [
      'page:home',
      'page:dashboard-analysis',
      'page:dashboard-workplace',
    ],
    skillCodes: ['file-review', 'document-summary', 'knowledge-search'],
  };
  const nextContext = {
    id: 'ctx-s2',
    systemId: 'system-2',
    systemCode: 'SYS2',
    systemName: 'System 2',
    scopeType: 'system' as const,
    permissions: ['page:home', 'page:dashboard-analysis'],
    skillCodes: ['file-review', 'knowledge-search'],
  };

  return {
    currentContext,
    nextContext,
    initialState: {
      currentUser: {
        name: 'Test User',
        contexts: [currentContext, nextContext],
        defaultContextId: currentContext.id,
      },
      currentContextId: currentContext.id,
    },
    setInitialState: vi.fn(),
    setCurrentContextId: vi.fn(),
  };
});

vi.mock('@umijs/max', () => ({
  useModel: () => ({
    initialState: testState.initialState,
    setInitialState: testState.setInitialState,
  }),
}));

vi.mock('@/utils/currentContext', () => ({
  setCurrentContextId: testState.setCurrentContextId,
}));

vi.mock('../HeaderDropdown', () => ({
  default: ({
    children,
    menu,
  }: {
    children: React.ReactNode;
    menu: {
      items?: Array<{
        disabled?: boolean;
        key: string;
        label?: React.ReactNode;
      }>;
      onClick?: (info: { key: string }) => void;
    };
  }) => (
    <div>
      {children}
      {menu.items?.map((item) => (
        <button
          disabled={item.disabled}
          key={item.key}
          onClick={() => menu.onClick?.({ key: item.key })}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('./style', () => ({
  default: () => ({ styles: { action: 'action' } }),
}));

describe('SysSwitch', () => {
  it('updates only the current tab context', async () => {
    render(<SysSwitch />);
    fireEvent.click(screen.getByRole('button', { name: 'System 2' }));

    await waitFor(() => {
      expect(testState.setCurrentContextId).toHaveBeenCalledWith(
        testState.nextContext.id,
      );
      expect(testState.setInitialState).toHaveBeenCalledOnce();
    });

    const updateState = testState.setInitialState.mock.calls[0][0];
    const updatedState = updateState(testState.initialState);

    expect(updatedState.currentContextId).toBe(testState.nextContext.id);
    expect(updatedState.currentUser).toEqual(
      testState.initialState.currentUser,
    );
    expect(updatedState.currentUser.defaultContextId).toBe(
      testState.currentContext.id,
    );
  });
});
