import type { TableProps } from 'antd';
import { Input, Table, Tag } from 'antd';
import WorkspacePage from '@/components/WorkspacePage';

export type KnowledgeSearchPageKey = 'overview' | 'sources' | 'history';

/** 知识检索页面标题与说明；key 来源于 App URL 的第一个通配路径片段。 */
const knowledgeSearchPageMeta: Record<
  KnowledgeSearchPageKey,
  { title: string; description: string }
> = {
  overview: {
    title: '搜索工作台',
    description: '从当前组织已接入的知识库中查找信息。',
  },
  sources: {
    title: '知识库',
    description: '查看当前组织已接入的知识来源及索引状态。',
  },
  history: {
    title: '搜索记录',
    description: '查看近期搜索关键词、范围和结果数量。',
  },
};

/** 未知子路径安全回到搜索工作台；不读取或修改标签状态。 */
export const resolveKnowledgeSearchPageKey = (
  pageKey: string | undefined,
): KnowledgeSearchPageKey =>
  pageKey === 'sources' || pageKey === 'history' ? pageKey : 'overview';

type KnowledgeSourceStatus = 'ready' | 'syncing' | 'attention';

/** 知识库表格静态行；后续由 Knowledge Source API 响应替换。 */
type KnowledgeSourceRecord = {
  /** React Table 稳定行键；正式接口应使用 knowledgeSourceId。 */
  key: string;
  /** 面向用户显示的知识库名称。 */
  name: string;
  /** 知识来源类型。 */
  type: string;
  /** 当前来源包含的文档数量。 */
  documentCount: number;
  /** 已进入搜索索引的文档数量。 */
  indexedCount: number;
  /** 当前同步或索引状态。 */
  status: KnowledgeSourceStatus;
  /** 最近一次同步时间。 */
  updatedAt: string;
};

const knowledgeSourceRows: KnowledgeSourceRecord[] = [
  {
    key: 'source-001',
    name: '组织制度与规范',
    type: '文档库',
    documentCount: 326,
    indexedCount: 326,
    status: 'ready',
    updatedAt: '今天 09:40',
  },
  {
    key: 'source-002',
    name: '产品与服务手册',
    type: '知识库',
    documentCount: 518,
    indexedCount: 506,
    status: 'syncing',
    updatedAt: '今天 09:18',
  },
  {
    key: 'source-003',
    name: '项目交付资料',
    type: '文件空间',
    documentCount: 294,
    indexedCount: 294,
    status: 'ready',
    updatedAt: '昨天 18:12',
  },
  {
    key: 'source-004',
    name: '历史会议纪要',
    type: '文档库',
    documentCount: 158,
    indexedCount: 142,
    status: 'attention',
    updatedAt: '7 月 18 日',
  },
];

/** 搜索记录静态行；后续由 Knowledge Search History API 响应替换。 */
type SearchHistoryRecord = {
  /** React Table 稳定行键；正式接口应使用 searchId。 */
  key: string;
  /** 用户提交的搜索关键词。 */
  query: string;
  /** 本次搜索使用的知识范围。 */
  scope: string;
  /** 搜索发起人。 */
  user: string;
  /** 返回的匹配结果数量。 */
  resultCount: number;
  /** 搜索发生时间。 */
  searchedAt: string;
};

const searchHistoryRows: SearchHistoryRecord[] = [
  {
    key: 'search-1024',
    query: '供应商准入需要哪些材料',
    scope: '组织制度与规范',
    user: 'Admin User',
    resultCount: 18,
    searchedAt: '今天 10:36',
  },
  {
    key: 'search-1023',
    query: '客户数据保留期限',
    scope: '全部知识库',
    user: 'Admin User',
    resultCount: 12,
    searchedAt: '今天 09:52',
  },
  {
    key: 'search-1022',
    query: '项目验收流程',
    scope: '项目交付资料',
    user: 'Operator User',
    resultCount: 26,
    searchedAt: '昨天 16:40',
  },
  {
    key: 'search-1021',
    query: '服务等级说明',
    scope: '产品与服务手册',
    user: 'Standard User',
    resultCount: 9,
    searchedAt: '昨天 14:18',
  },
];

const sourceStatusPresentation: Record<
  KnowledgeSourceStatus,
  { color: string; label: string }
> = {
  ready: { color: 'success', label: '可搜索' },
  syncing: { color: 'processing', label: '同步中' },
  attention: { color: 'warning', label: '需要关注' },
};

const sourceColumns: TableProps<KnowledgeSourceRecord>['columns'] = [
  {
    title: '知识库',
    dataIndex: 'name',
    render: (name: string, record) => (
      <div className="grid gap-0.5">
        <strong className="font-medium text-zinc-900 dark:text-zinc-100">
          {name}
        </strong>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {record.key}
        </span>
      </div>
    ),
  },
  { title: '类型', dataIndex: 'type', width: 120 },
  { title: '文档', dataIndex: 'documentCount', width: 100 },
  {
    title: '已索引',
    key: 'indexed',
    width: 120,
    render: (_, record) => `${record.indexedCount} / ${record.documentCount}`,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 120,
    render: (status: KnowledgeSourceStatus) => {
      const presentation = sourceStatusPresentation[status];
      return <Tag color={presentation.color}>{presentation.label}</Tag>;
    },
  },
  { title: '最近同步', dataIndex: 'updatedAt', width: 140 },
];

const searchHistoryColumns: TableProps<SearchHistoryRecord>['columns'] = [
  {
    title: '搜索内容',
    dataIndex: 'query',
    render: (query: string, record) => (
      <div className="grid gap-0.5">
        <strong className="font-medium text-zinc-900 dark:text-zinc-100">
          {query}
        </strong>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {record.key}
        </span>
      </div>
    ),
  },
  { title: '搜索范围', dataIndex: 'scope', width: 180 },
  { title: '搜索人', dataIndex: 'user', width: 140 },
  {
    title: '结果',
    dataIndex: 'resultCount',
    width: 90,
    render: (resultCount: number) => `${resultCount} 项`,
  },
  { title: '搜索时间', dataIndex: 'searchedAt', width: 140 },
];

const KnowledgeSourceTable = () => (
  <div className="overflow-hidden border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
    <Table<KnowledgeSourceRecord>
      columns={sourceColumns}
      dataSource={knowledgeSourceRows}
      pagination={false}
      scroll={{ x: 780 }}
      size="middle"
    />
  </div>
);

const SearchHistoryTable = ({ limit }: { limit?: number }) => (
  <div className="overflow-hidden border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
    <Table<SearchHistoryRecord>
      columns={searchHistoryColumns}
      dataSource={limit ? searchHistoryRows.slice(0, limit) : searchHistoryRows}
      pagination={false}
      scroll={{ x: 760 }}
      size="middle"
    />
  </div>
);

const KnowledgeSearchOverview = () => (
  <div className="grid gap-4">
    <section className="border border-zinc-200 bg-white px-6 py-7 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="max-w-2xl">
        <h2 className="m-0 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          搜索组织知识
        </h2>
        <p className="mt-1 mb-5 text-sm text-zinc-600 dark:text-zinc-300">
          当前为页面样式演示，尚未接入搜索服务。
        </p>
        <Input.Search
          aria-label="搜索组织知识"
          enterButton="搜索"
          placeholder="输入制度、产品或项目相关问题"
          size="large"
        />
      </div>
    </section>

    <dl className="grid overflow-hidden border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-3">
      {[
        ['知识库', knowledgeSourceRows.length],
        [
          '已索引文档',
          knowledgeSourceRows.reduce(
            (total, source) => total + source.indexedCount,
            0,
          ),
        ],
        ['今日搜索', 42],
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

    <section aria-labelledby="recent-search-title">
      <div className="flex items-center justify-between border border-b-0 border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2
          className="m-0 text-base font-semibold text-zinc-950 dark:text-zinc-50"
          id="recent-search-title"
        >
          最近搜索
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          最近 24 小时
        </span>
      </div>
      <SearchHistoryTable limit={3} />
    </section>
  </div>
);

/** 知识检索 Skill 静态页面；不保存搜索条件，也不发起业务请求。 */
const KnowledgeSearchPage = ({ pageKey }: { pageKey?: string }) => {
  const resolvedPageKey = resolveKnowledgeSearchPageKey(pageKey);
  const pageMeta = knowledgeSearchPageMeta[resolvedPageKey];
  const pageContent =
    resolvedPageKey === 'overview' ? (
      <KnowledgeSearchOverview />
    ) : resolvedPageKey === 'sources' ? (
      <KnowledgeSourceTable />
    ) : (
      <SearchHistoryTable />
    );

  return (
    <WorkspacePage
      breadcrumb={['知识检索', pageMeta.title]}
      title={pageMeta.title}
      description={pageMeta.description}
      actions={<Tag color="blue">静态演示</Tag>}
    >
      {pageContent}
    </WorkspacePage>
  );
};

export default KnowledgeSearchPage;
