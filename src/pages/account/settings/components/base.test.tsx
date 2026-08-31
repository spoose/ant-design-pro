import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateCurrentUserProfile } from '@/services/jushu-api/currentUser';
import BaseView from './base';

const mocks = vi.hoisted(() => ({
  initialValues: undefined as Record<string, unknown> | undefined,
  onFinish: undefined as
    | ((values: Record<string, unknown>) => Promise<void> | void)
    | undefined,
  currentUser: {
    userId: 'user-1',
    username: 'demo',
    name: 'Demo User',
    avatar: 'https://example.com/avatar.png',
    email: 'demo@example.com',
    status: 'active' as const,
    isSuperAdmin: false,
    platformPermissions: [] as string[],
    projectAppCodes: [] as string[],
    defaultOrganizationId: null,
    organizations: [],
  },
  setInitialState: vi.fn(async (updater: unknown) => {
    if (typeof updater === 'function') {
      (updater as (state: unknown) => unknown)({
        currentUser: mocks.currentUser,
      });
    }
  }),
}));

vi.mock('@umijs/max', () => ({
  useModel: () => ({
    initialState: { currentUser: mocks.currentUser },
    setInitialState: mocks.setInitialState,
  }),
}));

vi.mock('@ant-design/pro-components', async () => {
  const React = await import('react');

  const ProForm = ({
    children,
    initialValues,
    onFinish,
  }: {
    children?: React.ReactNode;
    initialValues?: Record<string, unknown>;
    onFinish?: (values: Record<string, unknown>) => Promise<void> | void;
  }) => {
    mocks.initialValues = initialValues;
    mocks.onFinish = onFinish;
    return <form>{children}</form>;
  };

  const ProFormText = ({
    disabled,
    fieldProps,
    label,
    placeholder,
  }: {
    disabled?: boolean;
    fieldProps?: { disabled?: boolean };
    label?: React.ReactNode;
    placeholder?: string;
  }) => (
    <input
      aria-label={String(label)}
      disabled={disabled || fieldProps?.disabled}
      placeholder={placeholder}
    />
  );

  const ProFormTextArea = ({
    disabled,
    label,
    placeholder,
  }: {
    disabled?: boolean;
    label?: React.ReactNode;
    placeholder?: string;
  }) => (
    <textarea
      aria-label={String(label)}
      disabled={disabled}
      placeholder={placeholder}
    />
  );

  return { ProForm, ProFormText, ProFormTextArea };
});

vi.mock('antd', () => ({
  Button: ({
    children,
    disabled,
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled}>
      {children}
    </button>
  ),
  Upload: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  message: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@ant-design/icons', () => ({
  UploadOutlined: () => <span />,
}));

vi.mock('./index.style', () => ({
  default: () => ({
    styles: {
      avatar: 'avatar',
      avatar_title: 'avatar-title',
      baseView: 'base-view',
      button_view: 'button-view',
      left: 'left',
      right: 'right',
    },
  }),
}));

vi.mock('@/services/auth', () => ({
  getAuthErrorDetails: () => ({ message: '更新失败' }),
}));

vi.mock('@/services/jushu-api/currentUser', () => ({
  updateCurrentUserProfile: vi.fn(),
}));

describe('BaseView account settings', () => {
  beforeEach(() => {
    mocks.initialValues = undefined;
    mocks.onFinish = undefined;
    vi.clearAllMocks();
    vi.mocked(updateCurrentUserProfile).mockResolvedValue({
      success: true,
      data: {
        ...mocks.currentUser,
        name: 'Updated Name',
        projectAppCodes: [...mocks.currentUser.projectAppCodes],
      },
      traceId: 'trace-1',
    });
  });

  it('keeps unfinished fields visible and disabled', async () => {
    render(<BaseView />);

    await waitFor(() => {
      expect(mocks.initialValues).toEqual({
        email: 'demo@example.com',
        name: 'Demo User',
      });
    });
    expect(screen.getByLabelText('签名')).toBeDisabled();
    expect(screen.getByLabelText('签名')).toHaveAttribute(
      'placeholder',
      '待开发',
    );
    expect(screen.getByLabelText('手机号')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: '更换头像（待开发）' }),
    ).toBeDisabled();
  });

  it('submits only the supported name field', async () => {
    render(<BaseView />);
    await waitFor(() => expect(mocks.onFinish).toBeTypeOf('function'));

    await mocks.onFinish?.({
      name: 'Updated Name',
      signature: 'ignored by disabled field',
      phone: '13800138000',
    });

    expect(updateCurrentUserProfile).toHaveBeenCalledWith({
      name: 'Updated Name',
    });
    expect(mocks.setInitialState).toHaveBeenCalled();
  });
});
