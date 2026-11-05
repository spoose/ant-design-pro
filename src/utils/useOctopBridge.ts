import { useEffect, useState } from 'react';
import WujieReact from 'wujie-react';
import {
  createOctopBridgeSession,
  type OctopBridgeSession,
  type OctopBridgeStatus,
} from './octopBridge';

type SessionEntry = {
  name: string;
  session: OctopBridgeSession;
  refs: number;
};

/**
 * 按实例名共享的会话表。Octop 页与「问问知识库助手」卡片都会引用同一实例，
 * 这里保证同一实例只订阅一次 octop:status，引用归零时才释放。
 */
const sessions = new Map<string, SessionEntry>();

const acquireSession = (name: string): OctopBridgeSession => {
  const existing = sessions.get(name);
  if (existing) {
    existing.refs += 1;
    return existing.session;
  }
  const session = createOctopBridgeSession(WujieReact.bus);
  sessions.set(name, { name, session, refs: 1 });
  return session;
};

const releaseSession = (name: string) => {
  const entry = sessions.get(name);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0) {
    entry.session.dispose();
    sessions.delete(name);
  }
};

/** 获取指定 Octop 实例的提问会话与当前登录状态。name 为空时不建立会话。 */
export function useOctopBridge(name: string | undefined): {
  session: OctopBridgeSession | undefined;
  status: OctopBridgeStatus;
} {
  const [session, setSession] = useState<OctopBridgeSession>();
  const [status, setStatus] = useState<OctopBridgeStatus>('idle');

  useEffect(() => {
    if (!name) {
      setSession(undefined);
      setStatus('idle');
      return;
    }
    const current = acquireSession(name);
    setSession(current);
    const unsubscribe = current.subscribe(setStatus);
    current.hello();
    return () => {
      unsubscribe();
      releaseSession(name);
    };
  }, [name]);

  return { session, status };
}
