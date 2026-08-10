import { describe, expect, it } from 'vitest';
import { getAdminUserErrorDetails } from './service';

describe('admin user errors', () => {
  it('keeps the backend error message and trace id', () => {
    const error = Object.assign(new Error('request failed'), {
      info: {
        errorCode: 'SUPER_ADMIN_REQUIRED',
        errorMessage: '此操作仅允许 Super Admin',
        traceId: 'trace-forbidden',
      },
    });

    expect(getAdminUserErrorDetails(error)).toEqual({
      message: '此操作仅允许 Super Admin',
      errorCode: 'SUPER_ADMIN_REQUIRED',
      traceId: 'trace-forbidden',
    });
  });

  it('reports an explicit offline error', () => {
    const error = Object.assign(new Error('Network Error'), { request: {} });

    expect(getAdminUserErrorDetails(error)).toEqual({
      message: '无法连接人员管理服务，请确认后端已经启动并检查网络连接',
    });
  });
});
