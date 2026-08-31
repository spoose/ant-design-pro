import { useLocation, useModel } from '@umijs/max';
import type { TableProps } from 'antd';
import { Table, Tag } from 'antd';
import WorkspacePage from '@/components/WorkspacePage';
import { buildWorkspaceBreadcrumb } from '@/utils/menuData';

type FlightStatus = 'flying' | 'scheduled' | 'completed' | 'warning';

type FlightTask = {
  key: string;
  taskName: string;
  organization: string;
  airspace: string;
  aircraft: string;
  status: FlightStatus;
  scheduledAt: string;
};

/** 政务低空演示数据；正式接口接入后由飞行任务查询响应替换。 */
const flightTasks: FlightTask[] = [
  {
    key: 'LA-20260826-018',
    taskName: '河道巡检',
    organization: '综合执法局',
    airspace: '兰江北段',
    aircraft: '无人机 07',
    status: 'flying',
    scheduledAt: '今天 15:30',
  },
  {
    key: 'LA-20260826-017',
    taskName: '交通拥堵巡查',
    organization: '公安交警大队',
    airspace: '城区中部',
    aircraft: '无人机 03',
    status: 'scheduled',
    scheduledAt: '今天 16:10',
  },
  {
    key: 'LA-20260826-014',
    taskName: '山林火情巡护',
    organization: '应急管理局',
    airspace: '南部林区',
    aircraft: '无人机 12',
    status: 'warning',
    scheduledAt: '今天 14:20',
  },
  {
    key: 'LA-20260826-011',
    taskName: '重点项目航拍',
    organization: '建设局',
    airspace: '开发区东片',
    aircraft: '无人机 05',
    status: 'completed',
    scheduledAt: '今天 11:40',
  },
];

const statusPresentation: Record<
  FlightStatus,
  { color: string; label: string }
> = {
  flying: { color: 'processing', label: '飞行中' },
  scheduled: { color: 'default', label: '待执行' },
  completed: { color: 'success', label: '已完成' },
  warning: { color: 'warning', label: '需关注' },
};

const flightColumns: TableProps<FlightTask>['columns'] = [
  {
    title: '任务',
    dataIndex: 'taskName',
    render: (taskName: string, record) => (
      <div className="grid gap-0.5">
        <strong className="font-medium text-zinc-900">{taskName}</strong>
        <span className="text-xs text-zinc-500">{record.key}</span>
      </div>
    ),
  },
  { title: '执行单位', dataIndex: 'organization', width: 150 },
  { title: '任务空域', dataIndex: 'airspace', width: 130 },
  { title: '航空器', dataIndex: 'aircraft', width: 120 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (status: FlightStatus) => {
      const presentation = statusPresentation[status];
      return <Tag color={presentation.color}>{presentation.label}</Tag>;
    },
  },
  { title: '计划时间', dataIndex: 'scheduledAt', width: 120 },
];

/** 政务低空 Mock 总览；只模拟首页内容，不产生真实飞行或审批操作。 */
const GovernmentLowAltitudePage = () => {
  const { pathname } = useLocation();
  const { initialState } = useModel('@@initialState');

  return (
    <WorkspacePage
      actions={<Tag color="blue">Mock 数据</Tag>}
      breadcrumb={buildWorkspaceBreadcrumb(
        initialState?.currentUser,
        pathname,
        ['政务低空', '运行总览'],
      )}
      description="汇总低空飞行任务、航空器运行状态和安全预警。"
      title="政务低空"
    >
      <div className="grid gap-4">
        <dl className="grid overflow-hidden border border-zinc-200 bg-white sm:grid-cols-4">
          {[
            ['今日飞行架次', '28'],
            ['在飞航空器', '6'],
            ['待审批任务', '4'],
            ['安全预警', '2'],
          ].map(([label, value]) => (
            <div
              className="border-b border-zinc-200 p-5 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
              key={label}
            >
              <dt className="text-sm text-zinc-500">{label}</dt>
              <dd className="mt-2 text-2xl font-semibold text-zinc-950">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="low-altitude-status-title">
          <header className="flex items-center justify-between border border-b-0 border-zinc-200 bg-white px-5 py-4">
            <h2
              className="m-0 text-base font-semibold text-zinc-950"
              id="low-altitude-status-title"
            >
              低空运行态势
            </h2>
            <Tag color="green">运行正常</Tag>
          </header>
          <div
            aria-label="低空运行态势模拟区域图"
            className="relative grid min-h-52 overflow-hidden border border-zinc-200 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_45%,#ecfdf5_100%)] p-6 sm:grid-cols-3"
            role="img"
          >
            {[
              ['兰江北段', '2 架在飞'],
              ['城区中部', '3 架在飞'],
              ['南部林区', '1 项预警'],
            ].map(([area, detail], index) => (
              <div
                className="m-auto grid size-32 place-content-center rounded-full border border-blue-200/80 bg-white/80 text-center shadow-sm"
                key={area}
              >
                <strong className="text-sm text-zinc-900">{area}</strong>
                <span
                  className={`mt-1 text-xs ${
                    index === 2 ? 'text-amber-600' : 'text-blue-600'
                  }`}
                >
                  {detail}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="recent-flight-task-title">
          <header className="border border-b-0 border-zinc-200 bg-white px-5 py-4">
            <h2
              className="m-0 text-base font-semibold text-zinc-950"
              id="recent-flight-task-title"
            >
              近期飞行任务
            </h2>
          </header>
          <div className="overflow-hidden border border-zinc-200 bg-white">
            <Table<FlightTask>
              columns={flightColumns}
              dataSource={flightTasks}
              pagination={false}
              scroll={{ x: 820 }}
              size="middle"
            />
          </div>
        </section>
      </div>
    </WorkspacePage>
  );
};

export default GovernmentLowAltitudePage;
