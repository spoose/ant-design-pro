import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OctopPage from '.';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  compatible: vi.fn(() => true),
  pathname: '/workspace/org/org-1/apps/octop/overview',
}));
vi.mock('qiankun-v3', () => ({
  loadMicroApp: mocks.load,
  isRuntimeCompatible: mocks.compatible,
}));
vi.mock('@umijs/max', async () => {
  const router =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    generatePath: router.generatePath,
    matchPath: router.matchPath,
    useLocation: () => ({ pathname: mocks.pathname }),
    useModel: () => ({ initialState: { currentUser: { userId: 'user-1' } } }),
  };
});

const pending: Array<() => void> = [];
function deferred() {
  let finish!: () => void;
  const promise = new Promise<void>((resolve) => {
    finish = resolve;
  });
  pending.push(finish);
  return { promise, finish };
}
const createApp = (
  mountPromise = Promise.resolve(),
  unmountPromise = Promise.resolve(),
) => ({
  loadPromise: Promise.resolve(),
  bootstrapPromise: Promise.resolve(),
  mountPromise,
  unmount: vi.fn(() => unmountPromise),
});

beforeEach(() => {
  mocks.load.mockReset();
  mocks.compatible.mockReturnValue(true);
  mocks.pathname = '/workspace/org/org-1/apps/octop/overview';
  Object.defineProperty(window, 'CSSScopeRule', {
    configurable: true,
    value: class {},
  });
});
afterEach(async () => {
  cleanup();
  await act(async () => {
    for (const finish of pending.splice(0)) finish();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

describe('Octop workspace container', () => {
  it('loads with isolation and retains its DOM until unmount completes', async () => {
    const done = deferred();
    const app = createApp(Promise.resolve(), done.promise);
    let child: HTMLElement | undefined;
    mocks.load.mockImplementation(
      ({ container }: { container: HTMLElement }) => {
        child = container;
        container.textContent = 'Octop content';
        return app;
      },
    );
    const view = render(<OctopPage />);
    await waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument(),
    );
    expect(mocks.load).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'octop',
        entry: 'http://localhost:4173/micro.html',
      }),
      { sandbox: { styleIsolation: true } },
    );
    view.unmount();
    await waitFor(() => expect(app.unmount).toHaveBeenCalledOnce());
    expect(child?.isConnected).toBe(true);
    expect(child?.closest('[hidden]')).not.toBeNull();
    done.finish();
    await waitFor(() => expect(child?.isConnected).toBe(false));
  });

  it('waits for a pending mount and teardown before opening the next instance', async () => {
    const mounted = deferred();
    const disposed = deferred();
    const first = createApp(mounted.promise, disposed.promise);
    const second = createApp();
    mocks.load.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const view = render(<OctopPage />);
    await waitFor(() => expect(mocks.load).toHaveBeenCalledOnce());
    view.unmount();
    render(<OctopPage />);
    mounted.finish();
    await waitFor(() => expect(first.unmount).toHaveBeenCalledOnce());
    expect(mocks.load).toHaveBeenCalledTimes(1);
    disposed.finish();
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2));
  });

  it('unmounts and reloads when the organization changes', async () => {
    const first = createApp();
    mocks.load.mockReturnValueOnce(first).mockReturnValueOnce(createApp());
    const view = render(<OctopPage />);
    await waitFor(() => expect(mocks.load).toHaveBeenCalledOnce());
    mocks.pathname = '/workspace/org/org-2/apps/octop/overview';
    view.rerender(<OctopPage />);
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2));
    expect(first.unmount).toHaveBeenCalledOnce();
  });

  it('shows a retry action after a load failure', async () => {
    const failed = createApp();
    mocks.load.mockImplementationOnce(() => ({
      ...failed,
      mountPromise: Promise.reject(new Error('Network unavailable')),
    }));
    mocks.load.mockReturnValueOnce(createApp());
    render(<OctopPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'octop 加载失败',
    );
    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2));
    expect(failed.unmount).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    );
  });

  it('shows an unsupported-browser message without loading Octop', async () => {
    mocks.compatible.mockReturnValue(false);
    render(<OctopPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '当前浏览器不支持',
    );
    expect(mocks.load).not.toHaveBeenCalled();
  });
});
