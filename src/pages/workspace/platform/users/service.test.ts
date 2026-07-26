import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAdminUserErrorDetails, listAdminUsers } from './service';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({ request: requestMock }));

describe('admin user service', () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      success: true,
      data: { list: [], page: 1, pageSize: 20, total: 0 },
      traceId: 'trace-users',
    });
  });

  it('requests the read-only Super Admin user endpoint with explicit paging', async () => {
    const params = {
      page: 1,
      pageSize: 20,
      keyword: 'admin',
      status: 'active' as const,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    };

    await listAdminUsers(params, { skipErrorHandler: true });

    expect(requestMock).toHaveBeenCalledWith('/api/admin/users', {
      method: 'GET',
      params,
      skipErrorHandler: true,
    });
  });

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
