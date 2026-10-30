import { useLocation, useModel } from '@umijs/max';
import { Alert, Button, Spin } from 'antd';
import type { MicroApp } from 'qiankun-v3';
import { useLayoutEffect, useRef, useState } from 'react';
import { OCTOP_MICRO_ENTRY } from '@/config/externalApps';
import { resolveWorkspaceScopeFromPath } from '@/utils/workspaceRoutes';
import { buildWorkspaceScopeKey } from '@/utils/workspaceState';

// A new route must wait for the previous Octop instance to finish unmounting.
let lifecycleQueue: Promise<void> = Promise.resolve();
const unsupportedBrowser =
  '当前浏览器不支持 octop 嵌入，请使用较新版本的 Chrome、Edge 或 Safari。';

const OctopPage = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const { pathname } = useLocation();
  const { initialState } = useModel('@@initialState');
  const userId = initialState?.currentUser?.userId;
  const scope = resolveWorkspaceScopeFromPath(pathname);
  const scopeKey = scope ? buildWorkspaceScopeKey(scope) : 'platform';

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const container = document.createElement('div');
    container.style.cssText = 'height:100%;min-height:0;contain:layout style';
    host.append(container);
    let cancelled = false;
    let instance: MicroApp | undefined;
    setError(undefined);
    setLoading(true);

    const running = lifecycleQueue
      .then(async () => {
        if (cancelled) return;
        const { isRuntimeCompatible, loadMicroApp } = await import(
          'qiankun-v3'
        );
        if (cancelled) return;
        if (!isRuntimeCompatible() || !('CSSScopeRule' in window)) {
          setError(unsupportedBrowser);
          setLoading(false);
          return;
        }
        const entry = new URL(OCTOP_MICRO_ENTRY, window.location.origin);
        if (
          !['http:', 'https:'].includes(entry.protocol) ||
          entry.username ||
          entry.password
        ) {
          throw new Error('Invalid Octop entry');
        }
        instance = loadMicroApp(
          { name: 'octop', entry: entry.href, container },
          { sandbox: { styleIsolation: true } },
        );
        void instance.loadPromise.catch(() => undefined);
        void instance.bootstrapPromise.catch(() => undefined);
        await instance.mountPromise;
        if (!cancelled) setLoading(false);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setLoading(false);
        setError(
          typeof cause === 'object' &&
            cause !== null &&
            'code' in cause &&
            cause.code === 'esm-unsupported'
            ? unsupportedBrowser
            : 'octop 加载失败，请确认服务已启动后重试。',
        );
      });
    lifecycleQueue = running;

    return () => {
      cancelled = true;
      // React cleanup cannot await; retain the owned DOM until qiankun finishes.
      const parking = document.createElement('div');
      parking.hidden = true;
      parking.append(container);
      document.body.append(parking);
      lifecycleQueue = running
        .then(async () => {
          if (instance) await instance.unmount();
        })
        .catch((cause: unknown) => {
          console.error('Octop unmount failed', cause);
        })
        .finally(() => parking.remove());
    };
  }, [attempt, scopeKey, userId]);

  return (
    <section
      aria-label="octop"
      className="relative h-full min-h-0 overflow-hidden bg-[#edf0f1] p-2 sm:p-3"
    >
      <div
        ref={hostRef}
        className="h-full min-h-0 overflow-hidden rounded-xl bg-[#fafafa] shadow-[0_1px_3px_rgba(30,41,45,0.08),0_8px_24px_rgba(30,41,45,0.06)]"
      />
      {loading && (
        <div
          role="status"
          aria-label="正在加载 octop"
          className="absolute inset-0 flex items-center justify-center"
        >
          <Spin />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <Alert
            type="error"
            showIcon
            title="octop 暂时无法打开"
            description={error}
            action={
              <Button onClick={() => setAttempt((value) => value + 1)}>
                重试
              </Button>
            }
          />
        </div>
      )}
    </section>
  );
};

export default OctopPage;
