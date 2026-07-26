import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  type AuthNotificationApi,
  showAuthErrorNotification,
} from './authNotification';

describe('showAuthErrorNotification', () => {
  it('creates a persistent closable alert with the backend trace id', () => {
    const error = vi.fn();
    const notification: AuthNotificationApi = {
      error,
      destroy: vi.fn(),
    };

    showAuthErrorNotification(notification, {
      key: 'login-request-error',
      title: '登录失败',
      details: {
        message: '用户名或密码错误',
        traceId: 'trace-login-error',
      },
    });

    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'login-request-error',
        title: '登录失败',
        duration: false,
        closable: true,
        role: 'alert',
      }),
    );

    const config = error.mock.calls[0]?.[0];
    render(config?.description);
    expect(screen.getByText('用户名或密码错误')).toBeInTheDocument();
    expect(screen.getByText('追踪编号：trace-login-error')).toBeInTheDocument();
  });
});
