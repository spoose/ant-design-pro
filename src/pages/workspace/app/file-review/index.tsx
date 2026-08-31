import { useLocation, useModel } from '@umijs/max';
import type { TableProps } from 'antd';
import { Table, Tag } from 'antd';
import WorkspacePage from '@/components/WorkspacePage';
import { buildWorkspaceBreadcrumb } from '@/utils/menuData';

export type FileReviewPageKey = 'overview' | 'queue' | 'history';

/** 文件审查页面标题与说明；key 来源于 App URL 的第一个通配路径片段。 */
const fileReviewPageMeta: Record<
  FileReviewPageKey,
  { title: string; description: string }
> = {
  overview: {
    title: '审查工作台',
    description: '集中查看待处理文件、审查进度和近期结果。',
  },
  queue: {
    title: '待审文件',
    description: '查看等待处理和正在审查的文件任务。',
  },
  history: {
    title: '审查记录',
    description: '查看已完成任务及其审查结果。',
  },
};

/** 未知子路径安全回到工作台，避免静态演示页出现空内容。 */
export const resolveFileReviewPageKey = (
  pageKey: string | undefined,
): FileReviewPageKey =>
  pageKey === 'queue' || pageKey === 'history' ? pageKey : 'overview';

type FileReviewStatus = 'pending' | 'reviewing' | 'completed' | 'attention';

/** 文件审查表格的静态演示行；后续由 File Review API 响应替换。 */
type FileReviewRecord = {
  /** React Table 稳定行键；正式接口应使用 reviewTaskId。 */
  key: string;
  /** 用户上传或业务系统同步的文件名。 */
  fileName: string;
  /** 文件进入审查流程的业务来源。 */
  source: string;
  /** 当前任务提交人。 */
  owner: string;
  /** 当前审查状态。 */
  status: FileReviewStatus;
  /** 审查发现的问题数量；尚未完成时可以为 undefined。 */
  issueCount?: number;
  /** 最近一次状态更新时间。 */
  updatedAt: string;
};

const activeReviewRows: FileReviewRecord[] = [
  {
    key: 'review-1008',
    fileName: '华东区域供应合同.docx',
    source: '合同管理',
    owner: '林晓',
    status: 'reviewing',
    updatedAt: '今天 10:24',
  },
  {
    key: 'review-1007',
    fileName: '2026 年第二季度采购清单.xlsx',
    source: '采购中心',
    owner: '周然',
    status: 'pending',
    updatedAt: '今天 09:18',
  },
  {
    key: 'review-1006',
    fileName: '数据处理补充协议.pdf',
    source: '法务中心',
    owner: '陈晨',
    status: 'attention',
    issueCount: 3,
    updatedAt: '昨天 17:42',
  },
];

const completedReviewRows: FileReviewRecord[] = [
  {
    key: 'review-1005',
    fileName: '客户服务条款修订稿.docx',
    source: '客户运营',
    owner: '唐琪',
    status: 'completed',
    issueCount: 0,
    updatedAt: '昨天 15:36',
  },
  {
    key: 'review-1004',
    fileName: '品牌授权使用协议.pdf',
    source: '品牌中心',
    owner: '许言',
    status: 'completed',
    issueCount: 2,
    updatedAt: '7 月 18 日',
  },
  {
    key: 'review-1003',
    fileName: '信息安全管理规范.docx',
    source: '信息安全',
    owner: '宋宁',
    status: 'completed',
    issueCount: 1,
    updatedAt: '7 月 17 日',
  },
];

const statusPresentation: Record<
  FileReviewStatus,
  { color: string; label: string }
> = {
  pending: { color: 'default', label: '等待审查' },
  reviewing: { color: 'processing', label: '审查中' },
  completed: { color: 'success', label: '已完成' },
  attention: { color: 'warning', label: '需要关注' },
};

const reviewColumns: TableProps<FileReviewRecord>['columns'] = [
  {
    title: '文件',
    dataIndex: 'fileName',
    render: (fileName: string, record) => (
      <div className="grid gap-0.5">
        <strong className="font-medium text-zinc-900 dark:text-zinc-100">
          {fileName}
        </strong>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {record.key}
        </span>
      </div>
    ),
  },
  { title: '来源', dataIndex: 'source', width: 140 },
  { title: '提交人', dataIndex: 'owner', width: 110 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 120,
    render: (status: FileReviewStatus) => {
      const presentation = statusPresentation[status];
      return <Tag color={presentation.color}>{presentation.label}</Tag>;
    },
  },
  {
    title: '发现问题',
    dataIndex: 'issueCount',
    width: 110,
    render: (issueCount: number | undefined) =>
      issueCount === undefined ? '—' : `${issueCount} 项`,
  },
  { title: '更新时间', dataIndex: 'updatedAt', width: 140 },
];

const ReviewTable = ({ rows }: { rows: FileReviewRecord[] }) => (
  <div className="overflow-hidden border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
    <Table<FileReviewRecord>
      columns={reviewColumns}
      dataSource={rows}
      pagination={false}
      scroll={{ x: 820 }}
      size="middle"
    />
  </div>
);

const ReviewOverview = () => (
  <div className="grid gap-4">
    <dl className="grid overflow-hidden border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-3">
      {[
        ['待审文件', 12],
        ['审查中', 3],
        ['今日完成', 28],
      ].map(([label, value]) => (
        <div
          className="border-b border-zinc-200 p-5 last:border-b-0 dark:border-zinc-800 sm:border-r sm:border-b-0 sm:last:border-r-0"
          key={label}
        >
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">{label}</dt>
          <dd className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            {value}
          </dd>
        </div>
      ))}
    </dl>
    <section aria-labelledby="recent-review-title">
      <div className="flex items-center justify-between border border-b-0 border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2
          className="m-0 text-base font-semibold text-zinc-950 dark:text-zinc-50"
          id="recent-review-title"
        >
          最近任务
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          最近 24 小时
        </span>
      </div>
      <ReviewTable rows={[...activeReviewRows, completedReviewRows[0]]} />
    </section>
  </div>
);

/** 文件审查 App 的静态页面；pageKey 只控制当前 App 标签内部视图。 */
const FileReviewPage = ({ pageKey }: { pageKey?: string }) => {
  const { pathname } = useLocation();
  const { initialState } = useModel('@@initialState');
  const resolvedPageKey = resolveFileReviewPageKey(pageKey);
  const pageMeta = fileReviewPageMeta[resolvedPageKey];
  const pageContent =
    resolvedPageKey === 'overview' ? (
      <ReviewOverview />
    ) : (
      <ReviewTable
        rows={
          resolvedPageKey === 'queue' ? activeReviewRows : completedReviewRows
        }
      />
    );

  return (
    <WorkspacePage
      breadcrumb={buildWorkspaceBreadcrumb(
        initialState?.currentUser,
        pathname,
        ['文件审查', pageMeta.title],
      )}
      title={pageMeta.title}
      description={pageMeta.description}
      actions={<Tag color="blue">静态演示</Tag>}
    >
      {pageContent}
    </WorkspacePage>
  );
};

export default FileReviewPage;
