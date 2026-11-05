/** wujie 事件总线的最小接口（只用到订阅、取消与发送）。 */
export type WujieBusLike = {
  $on: (event: string, fn: (payload?: unknown) => void) => unknown;
  $off: (event: string, fn: (payload?: unknown) => void) => unknown;
  $emit: (event: string, payload?: unknown) => unknown;
};

/**
 * 工作台与 wujie 内嵌 Octop 的提问协议（与 Octop 侧 workbenchBridge 保持一致）。
 * Octop → 工作台：`octop:status`，载荷 `{ status }`。
 * 工作台 → Octop：`workbench:hello`（请求重报状态）、`workbench:prompt`（提交问题）。
 */
export const OCTOP_STATUS_EVENT = 'octop:status';
export const WORKBENCH_HELLO_EVENT = 'workbench:hello';
export const WORKBENCH_PROMPT_EVENT = 'workbench:prompt';

type OctopReportedStatus =
  | 'checking'
  | 'authenticated'
  | 'unauthenticated'
  | 'offline';

export type OctopBridgeStatus = 'idle' | OctopReportedStatus;

type Listener = (status: OctopBridgeStatus) => void;

/**
 * 一个 Octop 实例的提问会话。
 * - 状态未知（Octop 未上报）或未登录时，提问只进入待发送队列，不会投递给 Octop。
 * - 登录后按顺序投递队列中的问题。
 */
export type OctopBridgeSession = {
  /** 请求 Octop 重报状态；订阅后调用一次，覆盖 Octop 先挂载的情况。 */
  hello: () => void;
  /** 提交一个问题。未登录时入队，登录后投递。 */
  submit: (prompt: string) => void;
  /** 订阅状态变化，立即回调当前状态。返回取消函数。 */
  subscribe: (listener: Listener) => () => void;
  /** 取消所有监听并清空队列。 */
  dispose: () => void;
};

/**
 * 为指定实例创建会话。bus 为 wujie 全局事件总线（`WujieReact.bus`），
 * 同一页面内的宿主与子应用共享同一事件表。
 */
export function createOctopBridgeSession(
  bus: WujieBusLike,
): OctopBridgeSession {
  let status: OctopBridgeStatus = 'idle';
  const pending: string[] = [];
  const listeners = new Set<Listener>();

  const setStatus = (next: OctopBridgeStatus) => {
    status = next;
    listeners.forEach((listener) => {
      listener(status);
    });
    if (status === 'authenticated') flush();
  };

  const flush = () => {
    while (pending.length > 0 && status === 'authenticated') {
      let accepted = false;
      bus.$emit(WORKBENCH_PROMPT_EVENT, {
        prompt: pending[0],
        accept: () => {
          accepted = true;
        },
      });
      if (!accepted) break;
      pending.shift();
    }
  };

  const onStatus = (payload: unknown) => {
    const next = (payload as { status?: unknown } | undefined)?.status;
    if (
      next === 'checking' ||
      next === 'authenticated' ||
      next === 'unauthenticated' ||
      next === 'offline'
    ) {
      setStatus(next);
    }
  };

  bus.$on(OCTOP_STATUS_EVENT, onStatus);

  return {
    hello: () => bus.$emit(WORKBENCH_HELLO_EVENT),
    submit: (prompt) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;
      pending.push(trimmed);
      // A cached login status does not guarantee the Chat listener is mounted.
      bus.$emit(WORKBENCH_HELLO_EVENT);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      listener(status);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose: () => {
      bus.$off(OCTOP_STATUS_EVENT, onStatus);
      listeners.clear();
      pending.length = 0;
    },
  };
}
