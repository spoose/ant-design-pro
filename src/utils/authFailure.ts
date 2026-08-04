import { clearAccessToken } from './authToken';

export type AccessTokenErrorCode =
  | 'ACCESS_TOKEN_MISSING'
  | 'ACCESS_TOKEN_INVALID'
  | 'ACCESS_TOKEN_EXPIRED';

const ACCESS_TOKEN_ERROR_CODES = new Set<AccessTokenErrorCode>([
  'ACCESS_TOKEN_MISSING',
  'ACCESS_TOKEN_INVALID',
  'ACCESS_TOKEN_EXPIRED',
]);
const LOGIN_PATH = '/user/login';

type RequestFailure = {
  info?: {
    errorCode?: string;
  };
  response?: {
    data?: {
      errorCode?: string;
    };
  };
};

type BrowserLocation = Pick<Location, 'pathname' | 'search' | 'hash'>;
type AccessTokenFailureOptions = {
  location?: BrowserLocation;
  navigate?: (target: string) => void;
};

let redirectingToLogin = false;

/** 兼容 Umi BizError 与底层 HTTP Error，避免请求层分别解析错误信封。 */
const getErrorCode = (error: unknown) => {
  const requestFailure = error as RequestFailure;
  return (
    requestFailure?.info?.errorCode ?? requestFailure?.response?.data?.errorCode
  );
};

export const isAccessTokenFailure = (error: unknown) => {
  const errorCode = getErrorCode(error);
  return (
    typeof errorCode === 'string' &&
    ACCESS_TOKEN_ERROR_CODES.has(errorCode as AccessTokenErrorCode)
  );
};

/** 保留完整页面地址，使用户重新登录后可以返回 Token 失效前的位置。 */
export const buildAccessTokenLoginPath = (location: BrowserLocation) => {
  if (location.pathname === LOGIN_PATH) return LOGIN_PATH;
  const returnUrl = `${location.pathname}${location.search}${location.hash}`;
  return `${LOGIN_PATH}?redirect=${encodeURIComponent(returnUrl)}`;
};

/**
 * 核心链路：三种 Access Token 错误 -> 清除本地 Token -> 保存当前 URL
 * -> 整页进入登录页。整页导航会同时卸载旧用户、权限和未完成请求状态。
 */
export const handleAccessTokenFailure = (
  error: unknown,
  options: AccessTokenFailureOptions = {},
) => {
  if (!isAccessTokenFailure(error)) return false;

  clearAccessToken();
  if (typeof window === 'undefined' || redirectingToLogin) return true;

  const location = options.location ?? window.location;
  const navigate =
    options.navigate ?? ((target: string) => window.location.replace(target));
  redirectingToLogin = true;
  navigate(buildAccessTokenLoginPath(location));
  return true;
};

/** 供无刷新恢复会话和单元测试重新启用失效跳转。 */
export const resetAccessTokenFailureRedirect = () => {
  redirectingToLogin = false;
};
