import { Link } from '@umijs/max';
import { useState, useSyncExternalStore } from 'react';
import { getAppDefinition } from '@/config/appRegistry';

/** 从 public 静态目录读取全部应用图标，确保内网或离线环境也能正常显示。 */
const appCatalogIconSrc = (name: string) =>
  `/assets/icons/app-catalog/${name}.png`;

type CatalogApp = {
  code: string;
  title: string;
  icon: string;
  subtitle: string;
};

const appCopy: Record<string, { icon: string; subtitle: string }> = {
  'ai-assistant': {
    icon: 'chatbot',
    subtitle: '处理日常管理与协作任务',
  },
  'integrated-operations': {
    icon: 'server',
    subtitle: '统一运维任务与资源状态',
  },
  'drone-operations': {
    icon: 'drone',
    subtitle: '低空飞行任务与运行态势',
  },
  'file-review': {
    icon: 'inspection',
    subtitle: '从空白开始，或让助手引导审查',
  },
  'document-summary': {
    icon: 'google-docs',
    subtitle: '提炼文档要点，生成可读摘要',
  },
  'knowledge-search': {
    icon: 'search-folder',
    subtitle: '在知识库中检索资料与答案',
  },
};

const extraApps: CatalogApp[] = [
  {
    code: 'meeting-minutes',
    title: '会议纪要',
    icon: 'video-conference',
    subtitle: '整理会议要点与待办',
  },
  {
    code: 'analytics-board',
    title: '数据看板',
    icon: 'statistics',
    subtitle: '查看用量与趋势分析',
  },
  {
    code: 'workflow-approval',
    title: '流程审批',
    icon: 'approval',
    subtitle: '处理待办审批事项',
  },
  {
    code: 'notice-center',
    title: '通知中心',
    icon: 'bell',
    subtitle: '查看平台消息与提醒',
  },
  {
    code: 'ticket-desk',
    title: '工单中心',
    icon: 'workflow',
    subtitle: '跟踪与处理平台工单',
  },
];

const fallbackCopy = { icon: 'documents', subtitle: '打开应用，继续当前工作' };
const NARROW_PREVIEW_COUNT = 4;
const DESKTOP_PREVIEW_COUNT = 8;
const NARROW_QUERY = '(max-width: 639px)';

const subscribeNarrow = (onChange: () => void) => {
  if (typeof window.matchMedia !== 'function') return () => undefined;
  const media = window.matchMedia(NARROW_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};

const getNarrowSnapshot = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia(NARROW_QUERY).matches;

const cardClassName =
  'flex h-22 min-w-0 items-center gap-3 rounded-lg border border-zinc-200 !bg-white px-4 text-inherit no-underline transition-colors hover:border-zinc-300 hover:!bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:border-zinc-200 dark:!bg-white dark:hover:!bg-white';

type PlatformAppCatalogProps = {
  appCodes: string[];
  getAppPath: (appCode: string) => string;
  emptyDescription?: string;
};

/** 工作台全部应用：白底横卡，左图标右标题/副标题。 */
const PlatformAppCatalog = ({
  appCodes,
  getAppPath,
  emptyDescription = '暂无授权应用。',
}: PlatformAppCatalogProps) => {
  const orderedAppCodes = appCodes.includes('ai-assistant')
    ? [
        'ai-assistant',
        ...appCodes.filter((appCode) => appCode !== 'ai-assistant'),
      ]
    : appCodes;

  const grantedApps: CatalogApp[] = orderedAppCodes.flatMap((appCode) => {
    const definition = getAppDefinition(appCode);
    if (!definition) return [];
    const copy = appCopy[appCode] ?? fallbackCopy;
    return [
      {
        code: appCode,
        title: definition.title,
        icon: copy.icon,
        subtitle: copy.subtitle,
      },
    ];
  });
  const extraVisible = extraApps.filter(
    (app) => !grantedApps.some((item) => item.code === app.code),
  );
  const catalogApps = [...grantedApps, ...extraVisible];
  const unknownCodes = orderedAppCodes.filter(
    (appCode) => !getAppDefinition(appCode),
  );
  const isNarrow = useSyncExternalStore(
    subscribeNarrow,
    getNarrowSnapshot,
    () => false,
  );
  const previewCount = isNarrow ? NARROW_PREVIEW_COUNT : DESKTOP_PREVIEW_COUNT;
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = catalogApps.length > previewCount;
  const hideOverflow = hasOverflow && !expanded;
  const visibleApps = hideOverflow
    ? catalogApps.slice(0, previewCount)
    : catalogApps;
  const hiddenCount = catalogApps.length - previewCount;
  const headerActionClassName =
    'border-0 bg-transparent p-0 text-xs text-orange-600 no-underline transition-colors hover:text-orange-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 motion-reduce:transition-none dark:text-orange-400 dark:hover:text-orange-300';

  return (
    <section aria-labelledby="platform-all-apps-title" className="grid gap-1">
      <header className="flex items-center justify-between gap-3">
        <h2
          className="m-0 text-base font-semibold text-zinc-950 dark:text-zinc-50"
          id="platform-all-apps-title"
        >
          全部应用
        </h2>
        <div className="flex shrink-0 items-center gap-3">
          {hasOverflow && expanded ? (
            <button
              className={headerActionClassName}
              onClick={() => setExpanded(false)}
              type="button"
            >
              收起
            </button>
          ) : null}
          <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
            {catalogApps.length} 项
          </span>
        </div>
      </header>

      {catalogApps.length || unknownCodes.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {unknownCodes.map((appCode) => (
            <div
              className="flex h-20 items-center rounded-lg bg-red-50 px-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
              key={appCode}
              role="alert"
            >
              前端未定义应用：<code>{appCode}</code>
            </div>
          ))}
          {visibleApps.map((app) => (
            <Link
              aria-label={app.title}
              className={cardClassName}
              key={app.code}
              to={getAppPath(app.code)}
            >
              <img
                alt=""
                className="size-12 shrink-0"
                draggable={false}
                src={appCatalogIconSrc(app.icon)}
              />
              <span className="grid min-w-0 gap-0.5">
                <strong className="truncate text-sm font-semibold text-zinc-950">
                  {app.title}
                </strong>
                <span className="truncate text-xs text-zinc-500">
                  {app.subtitle}
                </span>
              </span>
            </Link>
          ))}
          {hideOverflow ? (
            <button
              aria-expanded={false}
              aria-label={`展开其余 ${hiddenCount} 个应用`}
              className="flex h-22 min-w-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-300 !bg-white px-4 text-sm text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 motion-reduce:transition-none"
              type="button"
              onClick={() => setExpanded(true)}
            >
              展开 {hiddenCount} 个
            </button>
          ) : null}
        </div>
      ) : (
        <p className="m-0 rounded-lg border border-zinc-200 bg-white px-5 py-8 text-sm leading-6 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {emptyDescription}
        </p>
      )}
    </section>
  );
};

export default PlatformAppCatalog;
