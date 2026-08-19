import dayjs, { type Dayjs } from 'dayjs';

type MockScheduleItem = {
  key: string;
  date: string;
  time: string;
  title: string;
};

/** ponytail: 静态 mock，日程接口就绪后整表替换。 */
const mockScheduleItems: MockScheduleItem[] = [
  {
    key: 'usage-report',
    date: dayjs().format('YYYY-MM-DD'),
    time: '10:00',
    title: '用量周报',
  },
  {
    key: 'permission-review',
    date: dayjs().format('YYYY-MM-DD'),
    time: '15:30',
    title: '权限变更复核',
  },
  {
    key: 'maintenance',
    date: dayjs().add(3, 'day').format('YYYY-MM-DD'),
    time: '14:00',
    title: '系统维护窗口',
  },
];

/** 按选中日期过滤 mock 日程。 */
export const getMockScheduleForDate = (date: Dayjs) =>
  mockScheduleItems.filter((item) => item.date === date.format('YYYY-MM-DD'));
