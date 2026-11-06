import { RightOutlined } from '@ant-design/icons';
import { useNavigate } from '@umijs/max';
import { Button, Segmented } from 'antd';
import { useState } from 'react';
import { actionColors, statusColors, tagColors } from '@/theme/statusColors';
import {
  type NotificationFilter,
  type NotificationStatus,
  notificationItems,
} from '../../notifications/data';

const filterOptions: { value: NotificationFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'handled', label: '已处理' },
];
const severityMeta = {
  urgent: { label: '紧急', ...statusColors.error },
  high: { label: '高', ...statusColors.warning },
  normal: { label: '普通', ...actionColors },
};
const statusLabels: Record<NotificationStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  done: '已完成',
  rejected: '已驳回',
};
const isPending = (status: NotificationStatus) =>
  status === 'pending' || status === 'processing';

const PlatformNotificationCard = ({
  notificationCenterPath,
}: {
  notificationCenterPath: string;
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const pendingCount = notificationItems.filter(({ status }) =>
    isPending(status),
  ).length;
  const counts = {
    all: notificationItems.length,
    pending: pendingCount,
    handled: notificationItems.length - pendingCount,
  };
  const filteredItems = notificationItems.filter(
    ({ status }) =>
      filter === 'all' ||
      (filter === 'pending' ? isPending(status) : !isPending(status)),
  );
  const visibleItems = filteredItems.slice(0, 3);

  return (
    <section
      aria-labelledby="platform-notification-card-title"
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e0e7d8] bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
      data-testid="platform-notification-card"
    >
      <header className="min-w-0 shrink-0">
        <h2
          className="!m-0 text-xl font-medium leading-7 text-[#263221] dark:text-zinc-50"
          id="platform-notification-card-title"
        >
          通知
        </h2>
        <p className="!mb-0 !mt-1 text-[13px] leading-5 text-[#637257] dark:text-zinc-400">
          {pendingCount} 条待处理
        </p>
      </header>

      <div className="mt-4 shrink-0">
        <Segmented<NotificationFilter>
          aria-label="按通知状态筛选"
          className="!text-sm sm:!text-xs max-sm:[&_.ant-segmented-item-label]:!py-3"
          options={filterOptions.map(({ value, label }) => ({
            value,
            label: `${label} ${counts[value]}`,
          }))}
          size="small"
          value={filter}
          onChange={setFilter}
        />
      </div>

      <ol
        aria-live="polite"
        className="!mb-0 !mt-3 flex min-h-0 flex-1 list-none flex-col justify-between !p-0"
      >
        {visibleItems.map((item) => {
          const severity = severityMeta[item.severity];
          return (
            <li
              className="shrink-0 border-b border-zinc-100 py-2 last:border-b-0 dark:border-zinc-800"
              key={item.key}
            >
              <div className="flex min-w-0 items-center gap-1.5 text-xs leading-[18px] text-zinc-600 dark:text-zinc-400">
                <span className="min-w-0 truncate">{item.type}</span>
                <span
                  className="shrink-0 rounded px-1.5 text-[11px]"
                  style={{
                    backgroundColor: severity.soft,
                    color: severity.ink,
                  }}
                >
                  {severity.label}
                </span>
                {item.aiSuggested ? (
                  <span
                    className="shrink-0 rounded px-1.5 text-[11px]"
                    style={{
                      backgroundColor: tagColors.knowledge.soft,
                      color: '#6554ab',
                    }}
                  >
                    AI 建议
                  </span>
                ) : null}
                <time
                  className="ml-auto shrink-0 tabular-nums"
                  dateTime={item.dateTime}
                >
                  {item.time}
                </time>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <p className="!m-0 line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-5 text-zinc-800 dark:text-zinc-200">
                  {item.title}
                </p>
                {isPending(item.status) ? (
                  <Button
                    aria-label={`去处理：${item.title}`}
                    className="!h-11 !shrink-0 !px-1 !text-sm sm:!h-7 sm:!text-xs !text-zinc-600 dark:!text-zinc-400"
                    icon={<RightOutlined aria-hidden />}
                    iconPlacement="end"
                    size="small"
                    type="text"
                    onClick={() =>
                      navigate(
                        `${notificationCenterPath}?notification=${encodeURIComponent(item.key)}`,
                      )
                    }
                  >
                    处理
                  </Button>
                ) : (
                  <span className="shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {statusLabels[item.status]}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <footer className="mt-2 flex shrink-0 justify-end border-t border-zinc-100 pt-2 dark:border-zinc-800">
        <Button
          aria-label="查看全部通知"
          className="!h-11 !px-0 !text-sm sm:!h-6 sm:!text-xs !text-zinc-600 dark:!text-zinc-400"
          icon={<RightOutlined aria-hidden />}
          iconPlacement="end"
          onClick={() => navigate(notificationCenterPath)}
          size="small"
          type="text"
        >
          查看全部
        </Button>
      </footer>
    </section>
  );
};

export default PlatformNotificationCard;
