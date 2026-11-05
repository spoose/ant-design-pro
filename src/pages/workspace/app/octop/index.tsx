import { useLocation, useModel, useNavigate } from '@umijs/max';
import { Alert, Button } from 'antd';
import {
  type ComponentType,
  type RefAttributes,
  useEffect,
  useRef,
  useState,
} from 'react';
import WujieReact from 'wujie-react';
import { OCTOP_BASE_URL } from '@/config/externalApps';
import { getOctopInstanceName } from '@/utils/octopRuntime';
import { useOctopBridge } from '@/utils/useOctopBridge';
import { resolveWorkspaceScopeFromPath } from '@/utils/workspaceRoutes';

// The published wrapper omits its props and refresh method declarations.
type WujieHandle = { refresh: () => Promise<void> };
const Wujie = WujieReact as unknown as ComponentType<
  Parameters<typeof WujieReact.setupApp>[0] & {
    width: string;
    height: string;
  } & RefAttributes<WujieHandle>
>;

const OctopPage = () => {
  const wujieRef = useRef<WujieHandle>(null);
  const [error, setError] = useState<string>();
  const { pathname, search, hash, state } = useLocation();
  const navigate = useNavigate();
  const { initialState } = useModel('@@initialState');
  const userId = initialState?.currentUser?.userId;
  const scope = resolveWorkspaceScopeFromPath(pathname);
  const name = getOctopInstanceName(userId, scope);
  const { session } = useOctopBridge(name);

  // 首页「问问知识库助手」经 location.state 传入问题。交给 bridge 后清除 state，
  // 避免刷新或再次进入页面时重复发送；Octop 未登录时问题由 bridge 排队等待。
  useEffect(() => {
    const prompt = (state as { prompt?: unknown } | null)?.prompt;
    if (!session || typeof prompt !== 'string' || !prompt.trim()) return;
    session.submit(prompt);
    navigate({ pathname, search, hash }, { replace: true, state: {} });
  }, [session, state, pathname, search, hash, navigate]);

  const retry = () => {
    setError(undefined);
    void wujieRef.current?.refresh();
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
          key={name}
          ref={wujieRef}
          name={name}
          url={OCTOP_BASE_URL}
          width="100%"
          height="100%"
          alive={true}
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
