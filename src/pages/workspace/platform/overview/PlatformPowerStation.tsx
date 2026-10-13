import { useTheme } from 'antd-style';
import { useEffect, useRef, useState } from 'react';

// Extend the existing workbench with Anatomy's isometric generating unit.
// Keep the two working columns intact; show this illustration only in spare space.
const figureStyle = `
  :host .iso .iso-plate { padding: 0; background: transparent; }
  .iso-plate-corners, .iso-sr { display: none; }
`;

const PlatformPowerStation = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      setVisible(entry.contentRect.width > 0);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !visible) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;

    // Load just this figure, and release its WebGL contexts when the slot closes.
    import('anatomy-figures/element/power-station')
      .then(({ render }) => {
        if (cancelled) return;
        dispose = render(host, {
          theme: isDarkMode ? 'dark' : 'light',
          tokens: { '--anatomy-card': 'transparent' },
        });
        const root = host.shadowRoot;
        if (!root) return;
        if (paused) {
          const still = root.querySelector('.iso')?.cloneNode(true) as
            | HTMLElement
            | undefined;
          dispose();
          dispose = undefined;
          if (still) {
            still.querySelector('.iso-stage')?.removeAttribute('data-gl');
            still.querySelectorAll('canvas').forEach((canvas) => {
              canvas.remove();
            });
            root.append(still);
          }
        }
        const style = document.createElement('style');
        style.textContent = `${figureStyle}${paused ? '* { animation: none !important; }' : ''}`;
        root.append(style);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      dispose?.();
      host.shadowRoot?.replaceChildren();
    };
  }, [visible, paused, isDarkMode]);

  return (
    <figure
      aria-label="发电机组运行示意"
      className="m-0 hidden min-h-0 min-w-0 flex-col justify-center gap-4 @[80rem]/home:flex"
      data-testid="platform-power-station"
    >
      <div
        aria-hidden="true"
        className="w-full max-w-96 self-center"
        inert
        ref={hostRef}
      />
      <figcaption className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        <a
          className="!text-inherit underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
          href="https://skills.wheresryan.sh/anatomy/collection/power-station"
          rel="noreferrer"
          target="_blank"
        >
          发电机组 · 运行示意
        </a>
        {failed ? (
          <span>素材暂未加载</span>
        ) : (
          <button
            aria-label={paused ? '播放素材动画' : '暂停素材动画'}
            aria-pressed={paused}
            className="cursor-pointer rounded border-0 bg-transparent px-1 py-1 text-inherit hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:hover:text-zinc-100"
            onClick={() => setPaused((value) => !value)}
            type="button"
          >
            {paused ? '播放' : '暂停'}
          </button>
        )}
      </figcaption>
    </figure>
  );
};

export default PlatformPowerStation;
