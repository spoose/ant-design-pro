import { describe, expect, it, vi } from 'vitest';
import {
  createOctopBridgeSession,
  OCTOP_STATUS_EVENT,
  WORKBENCH_HELLO_EVENT,
  WORKBENCH_PROMPT_EVENT,
  type WujieBusLike,
} from './octopBridge';

type Handler = (payload?: unknown) => void;

function createFakeBus(acceptPrompts = true) {
  const handlers = new Map<string, Handler[]>();
  const bus: WujieBusLike & {
    emitted: Array<[string, unknown]>;
    fire: (event: string, payload?: unknown) => void;
    listenerCount: (event: string) => number;
  } = {
    emitted: [],
    $on: vi.fn((event: string, fn: Handler) => {
      handlers.set(event, [...(handlers.get(event) ?? []), fn]);
    }),
    $off: vi.fn((event: string, fn: Handler) => {
      handlers.set(
        event,
        (handlers.get(event) ?? []).filter((item) => item !== fn),
      );
    }),
    $emit: vi.fn((event: string, payload?: unknown) => {
      bus.emitted.push([event, payload]);
      if (event === WORKBENCH_PROMPT_EVENT && acceptPrompts) {
        (payload as { accept: () => void }).accept();
      }
    }),
    // 模拟 Octop 侧发来的事件。
    fire: (event, payload) => {
      (handlers.get(event) ?? []).forEach((fn) => {
        fn(payload);
      });
    },
    listenerCount: (event) => (handlers.get(event) ?? []).length,
  };
  return bus;
}

const promptsSentTo = (bus: ReturnType<typeof createFakeBus>) =>
  bus.emitted
    .filter(([event]) => event === WORKBENCH_PROMPT_EVENT)
    .map(([, payload]) => (payload as { prompt: string }).prompt);

describe('createOctopBridgeSession', () => {
  it('starts idle and subscribes to the Octop status event', () => {
    const bus = createFakeBus();
    const session = createOctopBridgeSession(bus);
    const listener = vi.fn();
    session.subscribe(listener);
    expect(listener).toHaveBeenLastCalledWith('idle');
    expect(bus.listenerCount(OCTOP_STATUS_EVENT)).toBe(1);
  });

  it('asks Octop to report its status on hello', () => {
    const bus = createFakeBus();
    const session = createOctopBridgeSession(bus);
    session.hello();
    expect(bus.emitted).toContainEqual([WORKBENCH_HELLO_EVENT, undefined]);
  });

  it('holds prompts while Octop has not reported a status and sends them after login', () => {
    const bus = createFakeBus();
    const session = createOctopBridgeSession(bus);
    session.submit('先排队');
    expect(promptsSentTo(bus)).toEqual([]);

    bus.fire(OCTOP_STATUS_EVENT, { status: 'authenticated' });
    expect(promptsSentTo(bus)).toEqual(['先排队']);
  });

  it('never delivers prompts while unauthenticated', () => {
    const bus = createFakeBus();
    const session = createOctopBridgeSession(bus);
    bus.fire(OCTOP_STATUS_EVENT, { status: 'unauthenticated' });
    session.submit('未登录提问');
    expect(promptsSentTo(bus)).toEqual([]);
  });

  it('delivers queued prompts in order once authenticated', () => {
    const bus = createFakeBus();
    const session = createOctopBridgeSession(bus);
    session.submit('第一条');
    session.submit('第二条');
    bus.fire(OCTOP_STATUS_EVENT, { status: 'authenticated' });
    expect(promptsSentTo(bus)).toEqual(['第一条', '第二条']);
  });

  it('trims prompts and drops blank input', () => {
    const bus = createFakeBus();
    const session = createOctopBridgeSession(bus);
    bus.fire(OCTOP_STATUS_EVENT, { status: 'authenticated' });
    session.submit('  查询用量  ');
    session.submit('   ');
    bus.fire(OCTOP_STATUS_EVENT, { status: 'authenticated' });
    expect(promptsSentTo(bus)).toEqual(['查询用量']);
  });

  it('keeps a prompt until the mounted Octop listener accepts it', () => {
    const bus = createFakeBus(false);
    const session = createOctopBridgeSession(bus);
    bus.fire(OCTOP_STATUS_EVENT, { status: 'authenticated' });
    session.submit('今日菜单');
    expect(promptsSentTo(bus)).toEqual([]);

    bus.fire(OCTOP_STATUS_EVENT, { status: 'authenticated' });
    expect(promptsSentTo(bus)).toEqual(['今日菜单']);

    bus.$emit = vi.fn((event, payload) => {
      if (event === WORKBENCH_PROMPT_EVENT) {
        (payload as { accept: () => void }).accept();
      }
    });
    bus.fire(OCTOP_STATUS_EVENT, { status: 'authenticated' });
    expect(bus.$emit).toHaveBeenCalledTimes(1);
    expect(bus.$emit).toHaveBeenCalledWith(
      WORKBENCH_PROMPT_EVENT,
      expect.objectContaining({ prompt: '今日菜单' }),
    );

    bus.fire(OCTOP_STATUS_EVENT, { status: 'authenticated' });
    expect(bus.$emit).toHaveBeenCalledTimes(1);
  });

  it('ignores malformed status payloads', () => {
    const bus = createFakeBus();
    const session = createOctopBridgeSession(bus);
    const listener = vi.fn();
    session.subscribe(listener);
    bus.fire(OCTOP_STATUS_EVENT, { status: 'yes' });
    bus.fire(OCTOP_STATUS_EVENT);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith('idle');
  });

  it('returns to blocking prompts after logout', () => {
    const bus = createFakeBus();
    const session = createOctopBridgeSession(bus);
    bus.fire(OCTOP_STATUS_EVENT, { status: 'authenticated' });
    bus.fire(OCTOP_STATUS_EVENT, { status: 'unauthenticated' });
    session.submit('登出后');
    expect(promptsSentTo(bus)).toEqual([]);
  });

  it('removes its status listener and clears the queue on dispose', () => {
    const bus = createFakeBus();
    const session = createOctopBridgeSession(bus);
    session.submit('将被丢弃');
    session.dispose();
    expect(bus.listenerCount(OCTOP_STATUS_EVENT)).toBe(0);
    bus.fire(OCTOP_STATUS_EVENT, { status: 'authenticated' });
    expect(promptsSentTo(bus)).toEqual([]);
  });
});
