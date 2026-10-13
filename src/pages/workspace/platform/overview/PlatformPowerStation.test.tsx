import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PlatformPowerStation from './PlatformPowerStation';

const { renderFigure, disposeFigure } = vi.hoisted(() => ({
  renderFigure: vi.fn(),
  disposeFigure: vi.fn(),
}));

vi.mock('anatomy-figures/element/power-station', () => ({
  render: renderFigure,
}));
vi.mock('antd-style', () => ({ useTheme: () => ({ isDarkMode: false }) }));

let resize: (width: number) => void;
const disconnect = vi.fn();

describe('PlatformPowerStation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = (width) =>
            callback(
              [{ contentRect: { width } } as ResizeObserverEntry],
              this as unknown as ResizeObserver,
            );
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    renderFigure.mockImplementation((host: HTMLElement) => {
      const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
      root.innerHTML =
        '<div class="iso"><div class="iso-stage" data-gl><svg></svg><canvas></canvas></div></div>';
      return () => {
        disposeFigure();
        root.replaceChildren();
      };
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('mounts only when there is spare width and releases WebGL on collapse', async () => {
    render(<PlatformPowerStation />);
    act(() => resize(0));
    expect(renderFigure).not.toHaveBeenCalled();

    act(() => resize(284));
    await waitFor(() => expect(renderFigure).toHaveBeenCalledTimes(1));
    expect(renderFigure.mock.calls[0][1]).toEqual({
      theme: 'light',
      tokens: { '--anatomy-card': 'transparent' },
    });

    act(() => resize(0));
    expect(disposeFigure).toHaveBeenCalledTimes(1);
  });

  it('pauses as a static SVG with no live canvas and resumes on request', async () => {
    render(<PlatformPowerStation />);
    act(() => resize(284));
    await waitFor(() => expect(renderFigure).toHaveBeenCalledTimes(1));
    const host = renderFigure.mock.calls[0][0] as HTMLElement;

    fireEvent.click(screen.getByRole('button', { name: '暂停素材动画' }));
    await waitFor(() => expect(renderFigure).toHaveBeenCalledTimes(2));
    expect(disposeFigure).toHaveBeenCalledTimes(2);
    expect(host.shadowRoot?.querySelector('svg')).not.toBeNull();
    expect(host.shadowRoot?.querySelector('canvas')).toBeNull();
    expect(host.shadowRoot?.querySelector('[data-gl]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '播放素材动画' }));
    await waitFor(() => expect(renderFigure).toHaveBeenCalledTimes(3));
    expect(host.shadowRoot?.querySelector('canvas')).not.toBeNull();
  });

  it('disconnects observers and releases the figure on navigation', async () => {
    const { unmount } = render(<PlatformPowerStation />);
    act(() => resize(284));
    await waitFor(() => expect(renderFigure).toHaveBeenCalledTimes(1));
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(disposeFigure).toHaveBeenCalledTimes(1);
  });
});
