import { Calendar, List } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { getMockScheduleForDate } from './mockSchedule';

/** 工作台右侧 mock 日历；点击日期切换下方安排列表。 */
const PlatformMockCalendar = () => {
  const [selectedDate, setSelectedDate] = useState(() => dayjs());
  const scheduleItems = useMemo(
    () => getMockScheduleForDate(selectedDate),
    [selectedDate],
  );
  const isToday = selectedDate.isSame(dayjs(), 'day');

  return (
    <section
      aria-labelledby="platform-calendar-title"
      className="min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    >
      <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2
          className="m-0 text-base font-semibold text-zinc-950 dark:text-zinc-50"
          id="platform-calendar-title"
        >
          日历
        </h2>
      </header>

      <div className="border-b border-zinc-200 px-1 py-1 dark:border-zinc-800 [&_.ant-picker-calendar]:bg-transparent [&_.ant-picker-calendar-mini_.ant-picker-content]:text-xs [&_.ant-picker-calendar-mini_.ant-picker-cell-inner]:size-6 [&_.ant-picker-calendar-mini_.ant-picker-panel]:border-0">
        <Calendar
          fullscreen={false}
          onSelect={setSelectedDate}
          value={selectedDate}
        />
      </div>

      <div className="px-4 py-3">
        <h3 className="m-0 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {isToday ? '今日安排' : `${selectedDate.format('M月D日')}安排`}
        </h3>
        {scheduleItems.length ? (
          <List
            className="mt-3"
            dataSource={scheduleItems}
            renderItem={(item) => (
              <List.Item className="px-0!" key={item.key}>
                <List.Item.Meta description={item.time} title={item.title} />
              </List.Item>
            )}
            split={false}
          />
        ) : (
          <p className="m-0 mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            无其他安排
          </p>
        )}
      </div>
    </section>
  );
};

export default PlatformMockCalendar;
