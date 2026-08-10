import { request } from '@umijs/max';
import type {
  CreateOrganizationInput,
  OrganizationSummary,
  UpdateOrganizationInput,
} from './data.d';

type ApiSuccess<T> = {
  success: true;
  data: T;
  traceId: string;
};

type RequestOptions = { [key: string]: unknown };

type RequestError = Error & {
  request?: unknown;
  info?: {
    errorCode?: string;
    errorMessage?: string;
    traceId?: string;
  };
  response?: {
    status?: number;
    data?: {
      errorCode?: string;
      errorMessage?: string;
      traceId?: string;
    };
  };
};

export type OrganizationErrorDetails = {
  message: string;
  errorCode?: string;
  traceId?: string;
};

/** 保留后端业务错误和 traceId，不用假数据掩盖组织管理接口失败。 */
export function getOrganizationErrorDetails(
  error: unknown,
): OrganizationErrorDetails {
  if (!(error instanceof Error)) return { message: '组织管理请求失败' };

  const requestError = error as RequestError;
  const errorCode =
    requestError.info?.errorCode ?? requestError.response?.data?.errorCode;
  const backendMessage =
    requestError.info?.errorMessage ??
    requestError.response?.data?.errorMessage;
  const traceId =
    requestError.info?.traceId ?? requestError.response?.data?.traceId;

  if (backendMessage) {
    return { message: backendMessage, errorCode, traceId };
  }

  if (requestError.request && !requestError.response) {
    return {
      message: '无法连接组织管理服务，请确认后端已经启动并检查网络连接',
    };
  }

  const responseStatus = requestError.response?.status;
  if (responseStatus && responseStatus >= 500) {
    return {
      message: `组织管理服务不可用（HTTP ${responseStatus}）`,
      errorCode,
      traceId,
    };
  }

  return { message: requestError.message, errorCode, traceId };
}

export async function listOrganizations(options?: RequestOptions) {
  return request<ApiSuccess<OrganizationSummary[]>>(
    '/api/admin/organizations/list',
    {
      method: 'POST',
      ...(options || {}),
    },
  );
}

export async function createOrganization(
  body: CreateOrganizationInput,
  options?: RequestOptions,
) {
  return request<ApiSuccess<OrganizationSummary>>(
    '/api/admin/organizations/create',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: body,
      ...(options || {}),
    },
  );
}

export async function updateOrganization(
  organizationId: string,
  body: UpdateOrganizationInput,
  options?: RequestOptions,
) {
  return request<ApiSuccess<OrganizationSummary>>(
    '/api/admin/organizations/update',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { organizationId, ...body },
      ...(options || {}),
    },
  );
}

export async function deleteOrganization(
  organizationId: string,
  options?: RequestOptions,
) {
  return request<ApiSuccess<{ organizationId: string }>>(
    '/api/admin/organizations/delete',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { organizationId },
      ...(options || {}),
    },
  );
}
