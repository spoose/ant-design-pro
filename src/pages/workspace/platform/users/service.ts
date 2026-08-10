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

export type AdminUserErrorDetails = {
  message: string;
  errorCode?: string;
  traceId?: string;
};

export function getAdminUserErrorDetails(
  error: unknown,
): AdminUserErrorDetails {
  if (!(error instanceof Error)) return { message: '人员列表请求失败' };

  const requestError = error as RequestError;
  const errorCode =
    requestError.info?.errorCode ?? requestError.response?.data?.errorCode;
  const backendMessage =
    requestError.info?.errorMessage ??
    requestError.response?.data?.errorMessage;
  const traceId =
    requestError.info?.traceId ?? requestError.response?.data?.traceId;

  if (backendMessage) return { message: backendMessage, errorCode, traceId };
  if (requestError.request && !requestError.response) {
    return {
      message: '无法连接人员管理服务，请确认后端已经启动并检查网络连接',
    };
  }
  return { message: requestError.message, errorCode, traceId };
}
