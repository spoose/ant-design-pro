import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessContext } from '@/services/auth';
import Home from './index';

const testState = vi.hoisted(() => ({
  initialState: {
    currentUser: {
      contexts: [
        {
          id: 'ctx-s1-g1',
          systemId: 'system-1',
          systemCode: 'SYS1',
          systemName: 'System 1',
          scopeType: 'department' as const,
          scopeName: 'Group 1',
          permissions: [
            'page:home',
            'page:dashboard-analysis',
            'page:dashboard-workplace',
          ],
          skillCodes: ['file-review', 'document-summary'],
        },
      ] as AccessContext[],
    },
    currentContextId: 'ctx-s1-g1',
  },
}));

vi.mock('@umijs/max', () => ({
  useIntl: () => ({
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) =>
      defaultMessage,
  }),
  useModel: () => ({ initialState: testState.initialState }),
}));

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children, title }: any) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));

vi.mock('@/components/CurrentAccessOverview', () => ({
  CurrentAccessOverview: ({ context }: { context: AccessContext }) => (
    <div>overview:{context.id}</div>
  ),
}));

describe('Home', () => {
  beforeEach(() => {
    testState.initialState.currentContextId = 'ctx-s1-g1';
  });

  it('renders the access overview for the current context', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: '首页' })).toBeVisible();
    expect(screen.getByText('overview:ctx-s1-g1')).toBeVisible();
  });

  it('exposes an invalid current context', () => {
    testState.initialState.currentContextId = 'missing-context';

    render(<Home />);

    expect(screen.getByRole('alert')).toHaveTextContent('未找到当前系统上下文');
  });
});
