const ACCESS_TOKEN_STORAGE_KEY = 'ant-design-pro.access-token';

/**
 * 保存 POST /api/login/account 签发的 access token，使登录态可跨页面刷新恢复。
 * token 会在主动退出、鉴权 401 或被新 token 替换时结束其前端生命周期。
 */
export function setAccessToken(token?: string) {
  if (typeof window === 'undefined') return;
  if (!token) {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
}

export function getAccessToken() {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? undefined;
}

export function clearAccessToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}
