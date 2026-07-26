import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAuthErrorDetails,
  loginWithPassword,
  logout,
  registerAccount,
  requestPasswordReset,
  resetPassword,
} from './auth';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({
  request: requestMock,
}));

describe('auth service', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('sends only account and password to the login endpoint', async () => {
    requestMock.mockResolvedValue({
      success: true,
      data: { accessToken: 'token' },
      traceId: 'trace-login',
    });

    await loginWithPassword(
      { account: 'admin@example.com', password: 'secret' },
      { skipErrorHandler: true },
    );

    expect(requestMock).toHaveBeenCalledWith('/api/login/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { account: 'admin@example.com', password: 'secret' },
      skipErrorHandler: true,
    });
  });

  it('uses the same four fields as the backend registration schema', async () => {
    const payload = {
      username: 'jushu.user',
      email: 'user@example.com',
      name: 'Jushu User',
      password: 'a secure password',
    };
    requestMock.mockResolvedValue({
      success: true,
      data: { userId: 'user-1', ...payload },
      traceId: 'trace-register',
    });

    await registerAccount(payload, { skipErrorHandler: true });

    expect(requestMock).toHaveBeenCalledWith('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: payload,
      skipErrorHandler: true,
    });
  });

  it('exposes the backend message and trace id', () => {
    const error = Object.assign(new Error('generic request error'), {
      info: {
        errorMessage: '用户名已存在',
        traceId: 'trace-conflict',
      },
    });

    expect(getAuthErrorDetails(error)).toEqual({
      message: '用户名已存在',
      traceId: 'trace-conflict',
    });
  });

  it('reports an explicit connection error when the backend is offline', () => {
    const error = Object.assign(new Error('Network Error'), {
      request: {},
    });

    expect(getAuthErrorDetails(error)).toEqual({
      message: '无法连接认证服务，请确认后端已经启动并检查网络连接',
    });
  });

  it('reports an explicit service error for an unavailable proxy target', () => {
    const error = Object.assign(new Error('Request failed'), {
      response: { status: 503 },
    });

    expect(getAuthErrorDetails(error)).toEqual({
      message: '认证服务不可用（HTTP 503），请确认后端已经启动',
    });
  });

  it('uses the password reset endpoints without legacy fields', async () => {
    requestMock.mockResolvedValue({ success: true, data: {}, traceId: 'trace' });

    await requestPasswordReset('user@example.com', {
      skipErrorHandler: true,
    });
    await resetPassword(
      { token: 'reset-token', password: 'a secure new password' },
      { skipErrorHandler: true },
    );

    expect(requestMock).toHaveBeenNthCalledWith(1, '/api/password/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { email: 'user@example.com' },
      skipErrorHandler: true,
    });
    expect(requestMock).toHaveBeenNthCalledWith(2, '/api/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { token: 'reset-token', password: 'a secure new password' },
      skipErrorHandler: true,
    });
  });

  it('uses the authenticated logout acknowledgement endpoint', async () => {
    requestMock.mockResolvedValue({
      success: true,
      data: { loggedOut: true, serverTokenRevoked: false },
      traceId: 'trace-logout',
    });

    await logout({ skipErrorHandler: true });

    expect(requestMock).toHaveBeenCalledWith('/api/login/outLogin', {
      method: 'POST',
      skipErrorHandler: true,
    });
  });
});
