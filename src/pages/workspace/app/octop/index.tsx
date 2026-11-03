import { useLocation, useModel } from '@umijs/max';
import { Alert, Button } from 'antd';
import { type ComponentType, useState } from 'react';
import WujieReact from 'wujie-react';
import { OCTOP_BASE_URL } from '@/config/externalApps';
import { resolveWorkspaceScopeFromPath } from '@/utils/workspaceRoutes';
import { buildWorkspaceScopeKey } from '@/utils/workspaceState';

// The published wrapper omits its props type; reuse the core option declaration.
const Wujie = WujieReact as unknown as ComponentType<
  Parameters<typeof WujieReact.setupApp>[0] & { width: string; height: string }
>;

const OctopPage = () => {
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string>();
  const { pathname } = useLocation();
  const { initialState } = useModel('@@initialState');
  const userId = initialState?.currentUser?.userId;
  const scope = resolveWorkspaceScopeFromPath(pathname);
  const scopeKey = scope ? buildWorkspaceScopeKey(scope) : 'platform';
  const name = `octop:${encodeURIComponent(userId ?? 'anonymous')}:${scopeKey}`;
  const retry = () => {
    setError(undefined);
    setAttempt((value) => value + 1);
  };

  return (
    <section
      aria-label="octop"
      className="relative h-full min-h-0 overflow-hidden bg-[#edf0f1] p-2 sm:p-3"
    >
      <div
        className="h-full min-h-0 overflow-hidden rounded-xl bg-[#fafafa] shadow-[0_1px_3px_rgba(30,41,45,0.08),0_8px_24px_rgba(30,41,45,0.06)] [&_wujie-app]:block [&_wujie-app]:h-full"
        // Keep the child's fixed layout and overlays inside its content area.
        style={{ contain: 'layout paint' }}
      >
        <Wujie
          key={`${name}:${attempt}`}
          name={name}
          url={OCTOP_BASE_URL}
          width="100%"
          height="100%"
          alive={false}
          sync
          props={{ reload: retry }}
          loadError={() => setError('octop 加载失败，请确认服务已启动后重试。')}
        />
      </div>
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <Alert
            type="error"
            showIcon
            title="octop 暂时无法打开"
            description={error}
            action={<Button onClick={retry}>重试</Button>}
          />
        </div>
      )}
    </section>
  );
};

export default OctopPage;
