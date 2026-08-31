import { Link } from '@umijs/max';
import type { AuthCurrentUser } from '@/services/auth';
import {
  getPlatformPagePath,
  getPlatformStatsPagePath,
} from '@/utils/workspaceRoutes';
import { getPlatformAccess } from '@/utils/workspaceRules';

/** Icons8 Fluency：https://icons8.com/icons/fluency */
const fluencySrc = (name: string) =>
  `https://img.icons8.com/fluency/96/${name}.png`;

type QuickEntryItem = {
  key: string;
  title: string;
  icon: string;
  to: string;
};

type PlatformQuickEntryProps = {
  /** 来源于 currentUser.platformPermissions，与侧栏同一套授权。 */
  permissions: string[];
};

/** 工作台快速入口：系统管理 / 统计叶子页 + 个人设置。不开应用标签。 */
const PlatformQuickEntry = ({ permissions }: PlatformQuickEntryProps) => {
  const access = getPlatformAccess({
    // 当前首页传空数组时按演示全开；实际页面访问仍由路由权限控制。
    platformPermissions: permissions.length ? permissions : ['*'],
  } as AuthCurrentUser);
  const entries: QuickEntryItem[] = [];

  if (access.canManagePlatformUsers) {
    entries.push({
      key: 'users',
      title: '用户管理',
      icon: 'conference',
      to: getPlatformPagePath('users'),
    });
  }
  if (access.canViewPlatformAudit) {
    entries.push({
      key: 'logs',
      title: '日志',
      icon: 'document',
      to: getPlatformPagePath('logs'),
    });
  }
  if (access.canViewStats) {
    entries.push(
      {
        key: 'stats-users',
        title: '用户规模',
        icon: 'bar-chart',
        to: getPlatformStatsPagePath('users'),
      },
      {
        key: 'stats-requests',
        title: '请求用量',
        icon: 'combo-chart',
        to: getPlatformStatsPagePath('requests'),
      },
    );
  }
  entries.push({
    key: 'account',
    title: '个人设置',
    icon: 'settings',
    to: '/account/settings',
  });

  return (
    <section
      aria-labelledby="platform-quick-entry-title"
      className="grid gap-3"
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
        aria-label="工作台快捷方式"
        className="flex flex-wrap gap-x-8 gap-y-3 rounded-lg border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {entries.map((entry) => (
          <Link
            aria-label={entry.title}
            className="group flex w-20 flex-col items-center gap-2 text-inherit no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
            key={entry.key}
            to={entry.to}
          >
            <span className="flex size-16 items-center justify-center rounded-lg bg-zinc-100 transition-colors group-hover:bg-zinc-200 motion-reduce:transition-none dark:bg-zinc-800 dark:group-hover:bg-zinc-700">
              <img
                alt=""
                className="size-10"
                draggable={false}
                src={fluencySrc(entry.icon)}
              />
            </span>
            <span className="w-full truncate text-center text-xs text-zinc-950 dark:text-zinc-50">
              {entry.title}
            </span>
          </Link>
        ))}
      </nav>
    </section>
  );
};

export default PlatformQuickEntry;
