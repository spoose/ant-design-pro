import { CalendarOutlined } from '@ant-design/icons';
import { Button, Calendar } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { statusColors, statusPillClassName } from '@/theme/statusColors';
import {
  platformOverviewCardClassName,
  platformOverviewCardHeaderClassName,
} from './cardChrome';
import { getMockScheduleForDate } from './mockSchedule';

/** 工作台右侧 mock 日历；点击日期切换安排列表。 */
const PlatformMockCalendar = () => {
  const [selectedDate, setSelectedDate] = useState(() => dayjs());
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const scheduleItems = useMemo(
    () => getMockScheduleForDate(selectedDate),
    [selectedDate],
  );
  const isToday = selectedDate.isSame(dayjs(), 'day');
  const scheduleTitle = isToday ? '今日安排' : '日程安排';

  return (
    <section
      aria-labelledby="platform-calendar-title"
      className={platformOverviewCardClassName}
    >
      <header
        className={`${platformOverviewCardHeaderClassName} justify-between gap-3`}
      >
        <div className="flex items-center gap-2">
          <CalendarOutlined
            aria-hidden
            className="shrink-0 leading-none"
            style={{ color: statusColors.error.ink, fontSize: 24 }}
          />
          <h2
            className="m-0 translate-y-1 text-base font-semibold leading-none text-zinc-900 dark:text-zinc-100"
            id="platform-calendar-title"
          >
            日程
          </h2>
        </div>
        {scheduleOpen ? null : (
          <Button
            aria-expanded={false}
            type="text"
            onClick={() => setScheduleOpen(true)}
          >
            {scheduleTitle}
          </Button>
        )}
      </header>

      <div
        className="grid min-h-0 flex-1 overflow-y-auto"
        data-testid="platform-calendar-grid"
      >
        <div
          className={`px-1 py-1 [&_.ant-picker-calendar]:bg-transparent [&_.ant-picker-calendar-mini_.ant-picker-content]:text-xs [&_.ant-picker-calendar-mini_.ant-picker-cell-inner]:size-6 [&_.ant-picker-calendar-mini_.ant-picker-panel]:border-0${
            scheduleOpen ? ' border-b border-zinc-200 dark:border-zinc-800' : ''
          }`}
        >
          <Calendar
            fullscreen={false}
            onSelect={setSelectedDate}
            value={selectedDate}
          />
        </div>

        {scheduleOpen ? (
          <aside
            aria-labelledby="platform-schedule-title"
            className="min-w-0 bg-white px-5 py-4 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <div className="min-w-0">
                <h3
                  className="m-0 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                  id="platform-schedule-title"
                >
                  {scheduleTitle}
                </h3>
              </div>
              <span className="flex shrink-0 items-center gap-1">
                <span className="text-xs font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
                  {scheduleItems.length} 项
                </span>
                <Button type="text" onClick={() => setScheduleOpen(false)}>
                  收起
                </Button>
              </span>
            </div>
            {scheduleItems.length ? (
              <ol
                aria-labelledby="platform-schedule-title"
                className="m-0 list-none divide-y divide-zinc-200 p-0 dark:divide-zinc-800"
              >
                {scheduleItems.map((item) => (
                  <li
                    className="flex items-center gap-3 py-4 last:pb-0"
                    key={item.key}
                  >
                    <time
                      className="w-14 shrink-0 text-sm font-medium leading-none text-zinc-600 tabular-nums dark:text-zinc-300"
                      dateTime={`${item.date}T${item.time}`}
                    >
                      {item.time}
                    </time>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: statusColors[item.status].ink,
                        }}
                      />
                      <span className="min-w-0 truncate text-sm font-medium leading-none text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </span>
                    </div>
                    <span className={statusPillClassName[item.status]}>
                      {item.statusLabel}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex min-h-32 items-center justify-center">
                <p className="m-0 text-sm text-zinc-500 dark:text-zinc-400">
                  当日暂无安排
                </p>
              </div>
            )}
          </aside>
        ) : null}
      </div>
    </section>
  );
};

export default PlatformMockCalendar;
