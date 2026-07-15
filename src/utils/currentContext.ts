import type { AccessContext } from '@/services/auth';

const CURRENT_CONTEXT_ID_KEY = 'current-context-id';

/**
 * 当前系统 ID 只在当前浏览器标签页生命周期内保存，用于页面刷新后恢复用户主动切换的系统。
 * 长期默认系统由 GET /api/currentUser 的 defaultContextId 提供，不写入这里。
 */
export function getCurrentContextId() {
  if (typeof window === 'undefined') return undefined;
  return window.sessionStorage.getItem(CURRENT_CONTEXT_ID_KEY) ?? undefined;
}

export function setCurrentContextId(contextId: string) {
  window.sessionStorage.setItem(CURRENT_CONTEXT_ID_KEY, contextId);
}

export function clearCurrentContextId() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(CURRENT_CONTEXT_ID_KEY);
}

/**
 * 恢复顺序为当前标签页选择、后端默认系统、无选择；失效的标签页 ID 会立即清理。
 */
export function resolveCurrentContextId(
  contexts: AccessContext[],
  defaultContextId?: string,
) {
  const storedContextId = getCurrentContextId();
  if (storedContextId) {
    if (contexts.some((context) => context.id === storedContextId)) {
      return storedContextId;
    }
    clearCurrentContextId();
  }

  return contexts.some((context) => context.id === defaultContextId)
    ? defaultContextId
    : undefined;
}
