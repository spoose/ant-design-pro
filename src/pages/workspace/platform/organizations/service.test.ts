import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createOrganization,
  deleteOrganization,
  getOrganizationErrorDetails,
  listOrganizations,
  updateOrganization,
} from './service';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({ request: requestMock }));

describe('organization management service', () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      success: true,
      data: {},
      traceId: 'trace-organization',
    });
  });

  it('uses the Super Admin organization endpoints without legacy fields', async () => {
    const createBody = {
      organizationCode: 'JUSHU',
      organizationName: 'Jushu AI',
      status: 'active' as const,
    };
    const updateBody = {
      organizationName: 'Jushu AI Updated',
      status: 'disabled' as const,
    };

    await listOrganizations({ skipErrorHandler: true });
    await createOrganization(createBody, { skipErrorHandler: true });
    await updateOrganization('organization-1', updateBody, {
      skipErrorHandler: true,
    });
    await deleteOrganization('organization-1', { skipErrorHandler: true });

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      '/api/admin/organizations/list',
      {
        method: 'POST',
        skipErrorHandler: true,
      },
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/organizations/create',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: createBody,
        skipErrorHandler: true,
      },
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      '/api/admin/organizations/update',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: { organizationId: 'organization-1', ...updateBody },
        skipErrorHandler: true,
      },
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      4,
      '/api/admin/organizations/delete',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: { organizationId: 'organization-1' },
        skipErrorHandler: true,
      },
    );
  });

  it('keeps the backend error code, message, and trace id', () => {
    const error = Object.assign(new Error('request failed'), {
      info: {
        errorCode: 'ORGANIZATION_IN_USE',
        errorMessage: '组织仍包含成员或授权',
        traceId: 'trace-delete',
      },
    });

    expect(getOrganizationErrorDetails(error)).toEqual({
      message: '组织仍包含成员或授权',
      errorCode: 'ORGANIZATION_IN_USE',
      traceId: 'trace-delete',
    });
  });

  it('reports an explicit connection failure when the backend is offline', () => {
    const error = Object.assign(new Error('Network Error'), { request: {} });

    expect(getOrganizationErrorDetails(error)).toEqual({
      message: '无法连接组织管理服务，请确认后端已经启动并检查网络连接',
    });
  });
});
