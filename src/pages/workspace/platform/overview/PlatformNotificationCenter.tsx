import { RightOutlined } from '@ant-design/icons';
import { useNavigate } from '@umijs/max';
import { Button } from 'antd';
import { useMemo, useState } from 'react';
import {
  actionColors,
  statusColors,
  statusPillClassName,
  tagColors,
} from '@/theme/statusColors';

type NotificationStatus = 'pending' | 'processing' | 'done' | 'rejected';
type NotificationSeverity = 'urgent' | 'high' | 'normal';
type NotificationFilter = 'all' | 'pending' | 'handled';

type NotificationItem = {
  key: string;
  type: string;
  title: string;
  time: string;
  dateTime: string;
  severity: NotificationSeverity;
  status: NotificationStatus;
  aiSuggested?: boolean;
};

const notificationItems: NotificationItem[] = [
  {
    key: 'drone-dam-inspection',
    type: '无人机审批',
    title: '水库大坝巡检 · 航线等待批准',
    time: '14:32',
    dateTime: '2026-08-31T14:32:00+08:00',
    severity: 'high',
    status: 'pending',
  },
  {
    key: 'weather-operation-notice',
    type: '无人机审批',
    title: '雷雨大风预警 · 4 条无人机航线建议改期',
    time: '13:48',
    dateTime: '2026-08-31T13:48:00+08:00',
    severity: 'urgent',
    status: 'pending',
    aiSuggested: true,
  },
  {
    key: 'charging-station-offline',
    type: '设备告警',
    title: '1 号机坪充电桩离线，运维人员正在处理',
    time: '11:40',
    dateTime: '2026-08-31T11:40:00+08:00',
    severity: 'urgent',
    status: 'processing',
  },
  {
    key: 'edge-node-upgrade',
    type: '系统维护',
    title: '边缘节点版本更新已完成',
    time: '昨日 23:10',
    dateTime: '2026-08-30T23:10:00+08:00',
    severity: 'normal',
    status: 'done',
  },
  {
    key: 'airport-zone-review',
    type: '无人机审批',
    title: '机场禁区临时航线申请未通过',
    time: '昨日 18:25',
    dateTime: '2026-08-30T18:25:00+08:00',
    severity: 'high',
    status: 'rejected',
  },
  {
    key: 'backup-complete',
    type: '运维通知',
    title: '飞行任务数据备份已完成',
    time: '昨日 02:00',
    dateTime: '2026-08-30T02:00:00+08:00',
    severity: 'normal',
    status: 'done',
  },
];

const statusMeta: Record<
  NotificationStatus,
  { label: string; className: string }
> = {
  pending: {
    label: '未批准',
    className: statusPillClassName.warning,
  },
  processing: {
    label: '处理中',
    className: `${statusPillClassName.warning} !bg-[#ebebed] !text-[#3f3f46]`,
  },
  done: {
    label: '已完成',
    className: statusPillClassName.success,
  },
  rejected: {
    label: '已驳回',
    className: statusPillClassName.error,
  },
};

const severityMeta: Record<
  NotificationSeverity,
  { label: string; ink: string; soft: string }
> = {
  urgent: {
    label: '紧急',
    ink: statusColors.error.ink,
    soft: statusColors.error.soft,
  },
  high: {
    label: '高',
    ink: statusColors.warning.ink,
    soft: statusColors.warning.soft,
  },
  normal: {
    label: '普通',
    ink: actionColors.ink,
    soft: actionColors.soft,
  },
};

const filterOptions: Array<{
  label: string;
  value: NotificationFilter;
}> = [
  { label: '全部', value: 'all' },
  { label: '待处理', value: 'pending' },
  { label: '已处理', value: 'handled' },
];

const PREVIEW_COUNT = 3;

const notificationCenterPath = '/workspace/platform/notifications';

const getNotificationCenterPath = (notificationKey: string) =>
  `${notificationCenterPath}?notification=${encodeURIComponent(notificationKey)}`;

const isPendingNotification = (status: NotificationStatus) =>
  status === 'pending' || status === 'processing';

const matchesFilter = (
  status: NotificationStatus,
  filter: NotificationFilter,
) => {
  if (filter === 'all') return true;
  if (filter === 'pending') return isPendingNotification(status);
  return !isPendingNotification(status);
};

/** 工作台右侧消息摘要；用状态筛选替代原日历的日期交互。 */
const PlatformNotificationCenter = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [expanded, setExpanded] = useState(false);
  const filteredItems = useMemo(
    () =>
      notificationItems.filter(({ status }) =>
        matchesFilter(status, activeFilter),
      ),
    [activeFilter],
  );
  const pendingCount = notificationItems.filter(({ status }) =>
    isPendingNotification(status),
  ).length;
  const hasOverflow = filteredItems.length > PREVIEW_COUNT;
  const hiddenCount = filteredItems.length - PREVIEW_COUNT;
  const visibleItems =
    hasOverflow && !expanded
      ? filteredItems.slice(0, PREVIEW_COUNT)
      : filteredItems;

  return (
    <section
      aria-labelledby="platform-notification-title"
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      data-testid="platform-notification-center"
    >
      <header className="shrink-0 px-5 pb-3 pt-4">
        <div className="flex items-start justify-between gap-4">
          <h2
            className="m-0 text-lg font-semibold leading-tight text-zinc-900 dark:text-zinc-100"
            id="platform-notification-title"
          >
            消息通知
          </h2>
          <span className="shrink-0 pt-0.5 text-xs font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
            {pendingCount} 条待处理
          </span>
        </div>

        <fieldset className="m-0 mt-3 min-w-0 border-0 p-0">
          <legend className="sr-only">按通知状态筛选</legend>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filterOptions.map((option) => {
              const count =
                option.value === 'all'
                  ? notificationItems.length
                  : notificationItems.filter(({ status }) =>
                      matchesFilter(status, option.value),
                    ).length;
              const selected = activeFilter === option.value;

              return (
                <button
                  aria-pressed={selected}
                  className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 motion-reduce:transition-none dark:focus-visible:outline-zinc-100 ${
                    selected
                      ? '!font-semibold'
                      : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-500 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100'
                  }`}
                  key={option.value}
                  onClick={() => {
                    setActiveFilter(option.value);
                    setExpanded(false);
                  }}
                  style={
                    selected
                      ? {
                          backgroundColor: actionColors.soft,
                          borderColor: actionColors.ink,
                          color: actionColors.ink,
                        }
                      : undefined
                  }
                  type="button"
                >
                  <span>{option.label}</span>
                  <span className="text-xs tabular-nums opacity-70">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </header>

      <ol
        aria-live="polite"
        className="m-0 min-h-0 flex-1 list-none overflow-y-auto border-t border-zinc-200 px-5 [scrollbar-color:#d4d4d8_transparent] [scrollbar-width:thin] dark:border-zinc-700 dark:[scrollbar-color:#52525b_transparent]"
      >
        {visibleItems.map((item) => {
          const severity = severityMeta[item.severity];
          const status = statusMeta[item.status];

          return (
            <li
              className="border-b border-zinc-200 py-3 last:border-b-0 dark:border-zinc-700"
              key={item.key}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  aria-label={`${severity.label}严重程度`}
                  className="size-2 shrink-0 rounded-full"
                  role="img"
                  style={{ backgroundColor: severity.ink }}
                />
                <span className="min-w-0 truncate text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {item.type}
                </span>
                {item.aiSuggested ? (
                  <span
                    className="inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium leading-none"
                    style={{
                      backgroundColor: tagColors.knowledge.soft,
                      color: tagColors.knowledge.ink,
                    }}
                  >
                    AI 建议
                  </span>
                ) : null}
                <time
                  className="ml-auto shrink-0 text-xs text-zinc-400 tabular-nums dark:text-zinc-500"
                  dateTime={item.dateTime}
                >
                  {item.time}
                </time>
              </div>
              <p className="m-0 text-sm font-semibold leading-5 text-zinc-900 dark:text-zinc-100">
                {item.title}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span
                    className="inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium leading-none"
                    style={{
                      backgroundColor: severity.soft,
                      color: severity.ink,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-current"
                    />
                    {severity.label}
                  </span>
                  {!isPendingNotification(item.status) ? (
                    <span className={status.className}>
                      <span
                        aria-hidden="true"
                        className="mr-1.5 size-1.5 rounded-full bg-current"
                      />
                      {status.label}
                    </span>
                  ) : null}
                </div>
                {isPendingNotification(item.status) ? (
                  <Button
                    aria-label={`去处理：${item.title}`}
                    className="!h-7 !gap-1 !rounded-md !border-zinc-950 !bg-zinc-950 !px-2 !text-xs !font-medium !text-white !shadow-none hover:!border-zinc-800 hover:!bg-zinc-800 dark:!border-zinc-100 dark:!bg-zinc-100 dark:!text-zinc-950 dark:hover:!border-white dark:hover:!bg-white"
                    icon={<RightOutlined aria-hidden />}
                    iconPlacement="end"
                    onClick={() =>
                      navigate(getNotificationCenterPath(item.key))
                    }
                    size="small"
                    type="primary"
                  >
                    处理
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
        {hasOverflow ? (
          <li className="py-2">
            <button
              aria-expanded={expanded}
              aria-label={
                expanded ? '收起通知' : `展开其余 ${hiddenCount} 条通知`
              }
              className="flex h-11 w-full cursor-pointer items-center justify-center rounded-md border-0 bg-zinc-50 px-4 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 motion-reduce:transition-none dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 dark:focus-visible:outline-zinc-100"
              onClick={() => setExpanded((current) => !current)}
              type="button"
            >
              {expanded ? '收起' : `展开 ${hiddenCount} 条`}
            </button>
          </li>
        ) : null}
      </ol>
    </section>
  );
};

export default PlatformNotificationCenter;
