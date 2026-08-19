import { CloseOutlined } from '@ant-design/icons';
import { Link, useModel } from '@umijs/max';
import { useEffect, useState } from 'react';
import { getSkillDefinition } from '@/config/skillRegistry';
import {
  readWorkspaceRecents,
  removeWorkspaceRecent,
  type WorkspaceRecent,
} from '@/utils/workspaceRecents';
import {
  getPlatformAppPagePath,
  getWorkspaceAppKey,
  getWorkspacePlatformPageKey,
  getWorkspaceStatsPageKey,
} from '@/utils/workspaceRoutes';
// backup icon: https://img.icons8.com/?size=100&id=CAAxfIniEgmO&format=png&color=000000

import { buildWorkspaceScopeKey } from '@/utils/workspaceState';

const platformScopeKey = buildWorkspaceScopeKey({ kind: 'platform' });
const PINNED_XONEAI: WorkspaceRecent = {
  title: getSkillDefinition('ai-assistant')?.title ?? 'xOneAI',
  url: getPlatformAppPagePath('ai-assistant', 'overview'),
};

/** Icons8 Parakeet Color：https://icons8.com/icons/all--style-parakeet */
const parakeetSrc = (name: string) =>
  `https://img.icons8.com/parakeet/48/${name}.png`;

const XONEAI_ICON = 'https://img.icons8.com/color/96/message-bot.png';

type RecentAppearance = { icon: string; soft: string };

const SKILL_APPEARANCE: Record<string, RecentAppearance> = {
  'ai-assistant': { icon: XONEAI_ICON, soft: '#f5f5f5' },
  'file-review': { icon: 'task', soft: '#d9fbdd' },
  'document-summary': { icon: 'reference', soft: '#f5f5f6' },
  'knowledge-search': { icon: 'search-folder', soft: '#e6f4ff' },
};

const STATS_APPEARANCE: Record<string, RecentAppearance> = {
  users: { icon: 'combo-chart', soft: '#e6f4ff' },
  requests: { icon: 'line-chart', soft: '#e6f4ff' },
  traces: { icon: 'timeline', soft: '#e6f4ff' },
};

const DEFAULT_APPEARANCE: RecentAppearance = {
  icon: 'organization-chart-people',
  soft: '#e8bf85',
};

const resolveRecentAppearance = (url: string): RecentAppearance => {
  const pathname = url.split(/[?#]/)[0] ?? url;
  const appKey = getWorkspaceAppKey(pathname);
  if (appKey) {
    return (
      SKILL_APPEARANCE[appKey] ?? {
        icon: 'folder',
        soft: DEFAULT_APPEARANCE.soft,
      }
    );
  }
  const statsPageKey = getWorkspaceStatsPageKey(pathname);
  if (statsPageKey) {
    return (
      STATS_APPEARANCE[statsPageKey] ?? {
        icon: 'statistics',
        soft: '#e6f4ff',
      }
    );
  }
  const pageKey = getWorkspacePlatformPageKey(pathname);
  if (pageKey === 'users') {
    return { icon: 'conference', soft: '#ebe9f5' };
  }
  if (pageKey === 'permissions') {
    return { icon: 'data-protection', soft: '#fff7cf' };
  }
  return DEFAULT_APPEARANCE;
};

const RecentLink = ({
  onRemove,
  recent,
}: {
  onRemove?: (url: string) => void;
  recent: WorkspaceRecent;
}) => {
  const { icon, soft } = resolveRecentAppearance(recent.url);
  const isXoneAi = icon === XONEAI_ICON;

  return (
    <div className="group flex w-20 shrink-0 flex-col items-center gap-2">
      <div className="relative size-14">
        <Link
          aria-label={`打开 ${recent.title}`}
          className="flex size-14 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          style={{ backgroundColor: soft }}
          to={recent.url}
        >
          <img
            alt={isXoneAi ? 'message-bot' : ''}
            className={isXoneAi ? 'size-12' : 'size-8'}
            draggable={false}
            height={isXoneAi ? 96 : 32}
            src={isXoneAi ? icon : parakeetSrc(icon)}
            width={isXoneAi ? 96 : 32}
          />
        </Link>
        {onRemove ? (
          <button
            aria-label={`从快速入口移除 ${recent.title}`}
            className="absolute -top-1 -right-1 z-[1] flex size-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 opacity-0 pointer-events-none transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 hover:text-zinc-950 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 motion-reduce:transition-none dark:border-zinc-600 dark:bg-white dark:text-zinc-600 dark:hover:text-zinc-950"
            onClick={() => onRemove(recent.url)}
            type="button"
          >
            <CloseOutlined className="text-[10px]" />
          </button>
        ) : null}
      </div>
      <Link
        aria-hidden
        className="w-full truncate text-center text-xs !text-zinc-950 no-underline hover:!text-zinc-950 dark:!text-zinc-50 dark:hover:!text-zinc-50"
        tabIndex={-1}
        to={recent.url}
      >
        {recent.title}
      </Link>
    </div>
  );
};

/** 工作台快速入口：xOneAI 固定首位，其后为最近打开（不含工作台首页）。 */
const PlatformQuickEntry = () => {
  const { initialState } = useModel('@@initialState');
  const userId = initialState?.currentUser?.userId ?? '';
  const [recents, setRecents] = useState<WorkspaceRecent[]>([]);

  useEffect(() => {
    setRecents(readWorkspaceRecents(userId, platformScopeKey));
  }, [userId]);

  const history = recents.filter(
    (item) => getWorkspaceAppKey(item.url) !== 'ai-assistant',
  );
  const entries = [PINNED_XONEAI, ...history];

  const removeRecent = (url: string) => {
    removeWorkspaceRecent(userId, platformScopeKey, url);
    setRecents(readWorkspaceRecents(userId, platformScopeKey));
  };

  return (
    <section
      aria-labelledby="platform-quick-entry-title"
      className="grid min-w-0 gap-3"
    >
      <header className="flex items-center justify-between gap-3">
        <h2
          className="m-0 text-base font-semibold text-zinc-950 dark:text-zinc-50"
          id="platform-quick-entry-title"
        >
          快速入口
        </h2>
        <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
          {entries.length} 项
        </span>
      </header>

      <nav
        aria-label="最近打开，可左右滑动"
        className="flex gap-3 overflow-x-auto overscroll-x-contain px-1 pt-2 pb-1 [scrollbar-width:thin]"
      >
        {entries.map((recent, index) => (
          <RecentLink
            key={recent.url}
            onRemove={index === 0 ? undefined : removeRecent}
            recent={recent}
          />
        ))}
      </nav>
    </section>
  );
};

export default PlatformQuickEntry;
