import { act, fireEvent, render, screen } from '@testing-library/react';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OctopPage from '.';

type WujieOptions = {
  name: string;
  url: string;
  alive: boolean;
  sync: boolean;
  props: { reload: () => void };
  loadError: (url: string, error: Error) => void;
};

const mocks = vi.hoisted(() => ({
  render: vi.fn<(options: WujieOptions) => void>(),
  mounted: vi.fn(),
  disposed: vi.fn(),
  refresh: vi.fn<() => Promise<void>>(),
  pathname: '/workspace/org/org-1/apps/octop/overview',
  userId: 'user-1',
}));
vi.mock('wujie-react', () => ({
  default: forwardRef(function WujieMock(options: WujieOptions, ref) {
    mocks.render(options);
    useImperativeHandle(ref, () => ({ refresh: mocks.refresh }), []);
    useEffect(() => {
      mocks.mounted(options.name);
      return () => mocks.disposed(options.name);
    }, []);
    return <div data-testid="octop-child">Octop content</div>;
  }),
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
    useModel: () => ({
      initialState: { currentUser: { userId: mocks.userId } },
    }),
  };
});

beforeEach(() => {
  mocks.render.mockClear();
  mocks.mounted.mockClear();
  mocks.disposed.mockClear();
  mocks.refresh.mockReset().mockResolvedValue(undefined);
  mocks.pathname = '/workspace/org/org-1/apps/octop/overview';
  mocks.userId = 'user-1';
});

describe('Octop workspace container', () => {
  it('uses the ordinary entry with keep-alive and route sync', () => {
    render(<OctopPage />);
    expect(mocks.render).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: 'octop:user-1:organization:org-1',
        url: 'http://localhost:5173/',
        alive: true,
        sync: true,
      }),
    );
    expect(screen.getByTestId('octop-child')).toBeInTheDocument();
  });

  it('remounts with a different instance name when the scope changes', () => {
    const view = render(<OctopPage />);
    const firstName = mocks.mounted.mock.calls[0][0];
    mocks.pathname = '/workspace/org/org-2/apps/octop/overview';
    view.rerender(<OctopPage />);
    expect(mocks.disposed).toHaveBeenCalledWith(firstName);
    expect(mocks.mounted).toHaveBeenCalledTimes(2);
    expect(mocks.mounted.mock.calls[1][0]).not.toBe(firstName);
  });

  it('remounts with a different instance name when the user changes', () => {
    const view = render(<OctopPage />);
    const firstName = mocks.mounted.mock.calls[0][0];
    mocks.userId = 'user-2';
    view.rerender(<OctopPage />);
    expect(mocks.disposed).toHaveBeenCalledWith(firstName);
    expect(mocks.mounted.mock.calls[1][0]).not.toBe(firstName);
  });

  it('uses the framework refresh after a load failure without remounting React', () => {
    render(<OctopPage />);
    const options = mocks.render.mock.calls[0][0];
    act(() => options.loadError(options.url, new Error('Network unavailable')));
    expect(screen.getByRole('alert')).toHaveTextContent('octop 加载失败');
    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(mocks.mounted).toHaveBeenCalledOnce();
    expect(mocks.disposed).not.toHaveBeenCalled();
  });

  it('connects the child reload callback to the same retry action', () => {
    render(<OctopPage />);
    const options = mocks.render.mock.calls[0][0];
    act(() => options.props.reload());
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(mocks.mounted).toHaveBeenCalledOnce();
    expect(mocks.disposed).not.toHaveBeenCalled();
  });

  it('unmounts the React wrapper when leaving the page', () => {
    const view = render(<OctopPage />);
    view.unmount();
    expect(mocks.disposed).toHaveBeenCalledOnce();
  });
});
