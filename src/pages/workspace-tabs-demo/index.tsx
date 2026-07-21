import {
  ApartmentOutlined,
  AppstoreOutlined,
  BookOutlined,
  ExportOutlined,
  FileSearchOutlined,
  GlobalOutlined,
  HistoryOutlined,
  HomeOutlined,
  InboxOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps, TableProps, TabsProps } from 'antd';
import {
  Breadcrumb,
  Button,
  Dropdown,
  Layout,
  Menu,
  Table,
  Tabs,
  Tooltip,
} from 'antd';
import { useState } from 'react';
import { useStyles } from './style';

const { Content, Sider } = Layout;

type DemoTabKey =
  | 'management'
  | 'sys1-home'
  | 'sys1-review'
  | 'sys2-home'
  | 'sys2-review';
type WorkspaceKey = 'management' | 'sys1-home' | 'sys2-home';
type MenuItem = Required<MenuProps>['items'][number];

type ReviewRecord = {
  key: string;
  fileName: string;
  status: '待审查' | '审查中' | '已完成';
  submitter: string;
  updatedAt: string;
};

type SystemRecord = {
  key: string;
  name: string;
  code: string;
  status: '运行中' | '维护中';
  owner: string;
  apps: number;
  updatedAt: string;
};

type SidebarConfig = {
  scopeLabel: string;
  permissionLabel: string;
  selectedKey: string;
  items: MenuItem[];
};

const INITIAL_TABS: DemoTabKey[] = [
  'management',
  'sys1-home',
  'sys1-review',
  'sys2-review',
];

const SYSTEM_ROWS: SystemRecord[] = [
  {
    key: 'sys1',
    name: '系统一',
    code: 'SYS1',
    status: '运行中',
    owner: '李明',
    apps: 6,
    updatedAt: '今天 09:42',
  },
  {
    key: 'sys2',
    name: '系统二',
    code: 'SYS2',
    status: '运行中',
    owner: '陈晓',
    apps: 4,
    updatedAt: '昨天 16:20',
  },
  {
    key: 'sys3',
    name: '数据交换平台',
    code: 'DATA',
    status: '维护中',
    owner: '王宁',
    apps: 3,
    updatedAt: '07-14 11:08',
  },
];

const REVIEW_ROWS: Record<'sys1' | 'sys2', ReviewRecord[]> = {
  sys1: [
    {
      key: '1',
      fileName: '华东区域供应商准入资料.pdf',
      status: '待审查',
      submitter: '周婧',
      updatedAt: '10 分钟前',
    },
    {
      key: '2',
      fileName: '2026 年第二季度采购清单.xlsx',
      status: '审查中',
      submitter: '方磊',
      updatedAt: '今天 09:36',
    },
    {
      key: '3',
      fileName: '客户数据使用授权书.pdf',
      status: '已完成',
      submitter: '林悦',
      updatedAt: '昨天 18:12',
    },
    {
      key: '4',
      fileName: '外包服务安全评估说明.docx',
      status: '已完成',
      submitter: '张驰',
      updatedAt: '昨天 15:04',
    },
  ],
  sys2: [
    {
      key: '1',
      fileName: '新零售门店上线检查表.xlsx',
      status: '审查中',
      submitter: '许澄',
      updatedAt: '6 分钟前',
    },
    {
      key: '2',
      fileName: '渠道合作协议补充说明.pdf',
      status: '待审查',
      submitter: '江宁',
      updatedAt: '今天 10:08',
    },
    {
      key: '3',
      fileName: '会员权益调整备案.docx',
      status: '已完成',
      submitter: '沈嘉',
      updatedAt: '昨天 17:26',
    },
    {
      key: '4',
      fileName: '促销活动合规审核单.pdf',
      status: '已完成',
      submitter: '赵蕴',
      updatedAt: '07-14 14:30',
    },
  ],
};

const SIDEBAR_BY_TAB: Record<DemoTabKey, SidebarConfig> = {
  management: {
    scopeLabel: '管理中心',
    permissionLabel: 'Super Admin',
    selectedKey: 'systems',
    items: [
      { key: 'systems', icon: <ApartmentOutlined />, label: '系统管理' },
      { key: 'people', icon: <TeamOutlined />, label: '人员管理' },
      {
        key: 'permissions',
        icon: <SafetyCertificateOutlined />,
        label: '权限策略',
      },
      { key: 'settings', icon: <SettingOutlined />, label: '平台设置' },
    ],
  },
  'sys1-home': {
    scopeLabel: '系统一',
    permissionLabel: '系统管理员',
    selectedKey: 'home',
    items: [
      { key: 'home', icon: <HomeOutlined />, label: '系统首页' },
      { key: 'members', icon: <TeamOutlined />, label: '成员管理' },
      {
        key: 'permissions',
        icon: <SafetyCertificateOutlined />,
        label: '系统权限',
      },
      { key: 'applications', icon: <AppstoreOutlined />, label: '应用管理' },
      { key: 'settings', icon: <SettingOutlined />, label: '系统设置' },
    ],
  },
  'sys1-review': {
    scopeLabel: '系统一 · 文件审查',
    permissionLabel: '审查管理员',
    selectedKey: 'queue',
    items: [
      { key: 'queue', icon: <InboxOutlined />, label: '审查队列' },
      { key: 'mine', icon: <UserOutlined />, label: '我的任务' },
      {
        key: 'rules',
        icon: <SafetyCertificateOutlined />,
        label: '审查规则',
      },
      { key: 'history', icon: <HistoryOutlined />, label: '处理记录' },
    ],
  },
  'sys2-home': {
    scopeLabel: '系统二',
    permissionLabel: '业务管理员',
    selectedKey: 'home',
    items: [
      { key: 'home', icon: <HomeOutlined />, label: '系统首页' },
      { key: 'members', icon: <TeamOutlined />, label: '成员管理' },
      { key: 'applications', icon: <AppstoreOutlined />, label: '应用管理' },
    ],
  },
  'sys2-review': {
    scopeLabel: '系统二 · 文件审查',
    permissionLabel: '普通审查人员',
    selectedKey: 'queue',
    items: [
      { key: 'queue', icon: <InboxOutlined />, label: '审查队列' },
      { key: 'mine', icon: <UserOutlined />, label: '我的任务' },
      { key: 'history', icon: <HistoryOutlined />, label: '处理记录' },
    ],
  },
};

const WORKSPACE_SWITCH_ITEMS: MenuProps['items'] = [
  { key: 'management', icon: <ApartmentOutlined />, label: '管理中心' },
  { key: 'sys1-home', icon: <AppstoreOutlined />, label: '系统一' },
  { key: 'sys2-home', icon: <AppstoreOutlined />, label: '系统二' },
];

const WORKSPACE_LABELS: Record<WorkspaceKey, string> = {
  management: '管理中心',
  'sys1-home': '系统一',
  'sys2-home': '系统二',
};

const tabSystemMeta: Partial<
  Record<DemoTabKey, { badge: string; fullName: string }>
> = {
  'sys1-home': { badge: 'S1', fullName: '系统一（SYS1）' },
  'sys1-review': { badge: 'S1', fullName: '系统一（SYS1）' },
  'sys2-home': { badge: 'S2', fullName: '系统二（SYS2）' },
  'sys2-review': { badge: 'S2', fullName: '系统二（SYS2）' },
};

const tabTitles: Record<DemoTabKey, string> = {
  management: '管理中心',
  'sys1-home': '首页',
  'sys1-review': '文件审查',
  'sys2-home': '首页',
  'sys2-review': '文件审查',
};

const Status = ({
  value,
}: {
  value: ReviewRecord['status'] | SystemRecord['status'];
}) => {
  const { styles, cx } = useStyles();
  return (
    <span className={styles.status}>
      <span
        className={cx(styles.statusDot, {
          [styles.statusPending]: value === '待审查' || value === '维护中',
          [styles.statusWorking]: value === '审查中',
          [styles.statusSuccess]: value === '已完成' || value === '运行中',
        })}
      />
      {value}
    </span>
  );
};

const reviewColumns: TableProps<ReviewRecord>['columns'] = [
  {
    title: '文件名称',
    dataIndex: 'fileName',
    key: 'fileName',
    ellipsis: true,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    render: (value: ReviewRecord['status']) => <Status value={value} />,
  },
  {
    title: '提交人',
    dataIndex: 'submitter',
    key: 'submitter',
    width: 120,
  },
  {
    title: '最近更新',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 140,
  },
  {
    title: '操作',
    key: 'operation',
    width: 88,
    render: () => (
      <Button type="link" size="small">
        查看
      </Button>
    ),
  },
];

const systemColumns: TableProps<SystemRecord>['columns'] = [
  { title: '系统名称', dataIndex: 'name', key: 'name' },
  { title: '系统标识', dataIndex: 'code', key: 'code', width: 120 },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    render: (value: SystemRecord['status']) => <Status value={value} />,
  },
  { title: '负责人', dataIndex: 'owner', key: 'owner', width: 120 },
  { title: '应用数', dataIndex: 'apps', key: 'apps', width: 100 },
  {
    title: '最近更新',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 140,
  },
  {
    title: '操作',
    key: 'operation',
    width: 88,
    render: () => (
      <Button type="link" size="small">
        进入
      </Button>
    ),
  },
];

const PageHeading = ({
  breadcrumb,
  title,
  description,
  actionLabel,
}: {
  breadcrumb: string[];
  title: string;
  description: string;
  actionLabel: string;
}) => {
  const { styles } = useStyles();
  return (
    <header className={styles.pageHeading}>
      <div className={styles.headingCopy}>
        <Breadcrumb items={breadcrumb.map((item) => ({ title: item }))} />
        <h1 className={styles.pageTitle}>{title}</h1>
        <p className={styles.pageDescription}>{description}</p>
      </div>
      <div className={styles.pageActions}>
        <Button icon={<ExportOutlined />}>导出</Button>
        <Button type="primary" icon={<PlusOutlined />}>
          {actionLabel}
        </Button>
      </div>
    </header>
  );
};

const ReviewPage = ({ system }: { system: 'sys1' | 'sys2' }) => {
  const { styles } = useStyles();
  const systemName = system === 'sys1' ? '系统一' : '系统二';

  return (
    <section aria-label={`${systemName}文件审查`}>
      <PageHeading
        breadcrumb={[systemName, '文件审查', '审查队列']}
        title="文件审查"
        description={`查看和处理${systemName}内提交的业务文件。`}
        actionLabel="新建审查"
      />
      <div className={styles.pageBody}>
        <div className={styles.filterSummary}>
          <span className={styles.filterActive}>全部 12</span>
          <span>待审查 4</span>
          <span>审查中 3</span>
          <span>已完成 5</span>
        </div>
        <Table<ReviewRecord>
          columns={reviewColumns}
          dataSource={REVIEW_ROWS[system]}
          pagination={{ pageSize: 4, showSizeChanger: false, total: 12 }}
          scroll={{ x: 760 }}
        />
      </div>
    </section>
  );
};

const ManagementPage = () => {
  const { styles } = useStyles();
  return (
    <section aria-label="系统管理">
      <PageHeading
        breadcrumb={['管理中心', '系统管理']}
        title="系统管理"
        description="统一管理已接入的业务系统与系统入口。"
        actionLabel="新增系统"
      />
      <div className={styles.pageBody}>
        <Table<SystemRecord>
          columns={systemColumns}
          dataSource={SYSTEM_ROWS}
          pagination={false}
          scroll={{ x: 840 }}
        />
      </div>
    </section>
  );
};

const SystemHomePage = ({
  system,
  onOpenReview,
}: {
  system: 'sys1' | 'sys2';
  onOpenReview: () => void;
}) => {
  const { styles } = useStyles();
  const systemName = system === 'sys1' ? '系统一' : '系统二';

  return (
    <section aria-label={`${systemName}首页`}>
      <PageHeading
        breadcrumb={[systemName, '首页']}
        title={systemName}
        description="从当前系统首页进入应用；应用会在独立工作标签中打开。"
        actionLabel="配置应用"
      />
      <div className={styles.pageBody}>
        <h2 className={styles.sectionTitle}>常用应用</h2>
        <div className={styles.applicationList}>
          <div className={styles.applicationItem}>
            <div className={styles.applicationIcon} aria-hidden="true">
              <FileSearchOutlined />
            </div>
            <div className={styles.applicationCopy}>
              <strong>文件审查</strong>
              <span>审查业务文件、跟踪处理状态与审查记录</span>
            </div>
            <Button type="primary" onClick={onOpenReview}>
              打开
            </Button>
          </div>
          <div className={styles.applicationItem}>
            <div className={styles.applicationCode} aria-hidden="true">
              MB
            </div>
            <div className={styles.applicationCopy}>
              <strong>成员目录</strong>
              <span>查看系统成员、组织归属与业务联系方式</span>
            </div>
            <span className={styles.secondaryLabel}>当前标签内打开</span>
          </div>
          <div className={styles.applicationItem}>
            <div className={styles.applicationCode} aria-hidden="true">
              CF
            </div>
            <div className={styles.applicationCopy}>
              <strong>系统配置</strong>
              <span>维护当前系统的基础参数与通知设置</span>
            </div>
            <span className={styles.secondaryLabel}>当前标签内打开</span>
          </div>
        </div>
      </div>
    </section>
  );
};

const TabLabel = ({ tabKey }: { tabKey: DemoTabKey }) => {
  const { styles } = useStyles();
  const systemMeta = tabSystemMeta[tabKey];

  return (
    <span className={styles.tabLabel}>
      {systemMeta ? (
        <Tooltip title={systemMeta.fullName} mouseEnterDelay={0.35}>
          <span className={styles.systemBadge}>{systemMeta.badge}</span>
        </Tooltip>
      ) : null}
      <span>{tabTitles[tabKey]}</span>
    </span>
  );
};

const WorkspaceTabsDemo = () => {
  const { styles } = useStyles();
  const [openTabs, setOpenTabs] = useState<DemoTabKey[]>(INITIAL_TABS);
  const [activeKey, setActiveKey] = useState<DemoTabKey>('sys1-review');
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const sidebarConfig = SIDEBAR_BY_TAB[activeKey];
  const activeWorkspaceKey: WorkspaceKey =
    activeKey === 'management'
      ? 'management'
      : activeKey.startsWith('sys1')
        ? 'sys1-home'
        : 'sys2-home';

  const activateTab = (tabKey: DemoTabKey) => {
    setOpenTabs((current) =>
      current.includes(tabKey) ? current : [...current, tabKey],
    );
    setActiveKey(tabKey);
  };

  const handleWorkspaceSwitch: MenuProps['onClick'] = ({ key }) => {
    activateTab(key as DemoTabKey);
  };

  const handleEdit: TabsProps['onEdit'] = (targetKey, action) => {
    if (action !== 'remove' || typeof targetKey !== 'string') return;

    const key = targetKey as DemoTabKey;
    const targetIndex = openTabs.indexOf(key);
    const nextTabs = openTabs.filter((item) => item !== key);
    setOpenTabs(nextTabs);

    if (activeKey === key) {
      setActiveKey(
        nextTabs[targetIndex - 1] ?? nextTabs[targetIndex] ?? 'management',
      );
    }
  };

  const tabItems: TabsProps['items'] = openTabs.map((tabKey) => ({
    key: tabKey,
    label: <TabLabel tabKey={tabKey} />,
    closable: tabKey !== 'management',
  }));

  const activePage =
    activeKey === 'management' ? (
      <ManagementPage />
    ) : activeKey === 'sys1-home' || activeKey === 'sys2-home' ? (
      <SystemHomePage
        system={activeKey === 'sys2-home' ? 'sys2' : 'sys1'}
        onOpenReview={() =>
          activateTab(activeKey === 'sys2-home' ? 'sys2-review' : 'sys1-review')
        }
      />
    ) : (
      <ReviewPage system={activeKey === 'sys2-review' ? 'sys2' : 'sys1'} />
    );

  return (
    <div className={styles.appShell}>
      <a className={styles.skipLink} href="#workspace-main">
        跳到主要内容
      </a>
      <header className={styles.globalHeader}>
        <div className={styles.brand}>
          <img src="/jushu-logo.svg" alt="" />
          <strong>JU SHU</strong>
        </div>
        <div className={styles.headerMeta}>
          <Dropdown
            placement="bottomRight"
            trigger={['click']}
            menu={{
              items: WORKSPACE_SWITCH_ITEMS,
              selectedKeys: [activeWorkspaceKey],
              onClick: handleWorkspaceSwitch,
              style: { minWidth: 192 },
            }}
          >
            <Button
              className={styles.workspaceEntry}
              type="text"
              icon={<AppstoreOutlined />}
              aria-label={`切换系统，当前为${WORKSPACE_LABELS[activeWorkspaceKey]}`}
            />
          </Dropdown>
          <Tooltip title="使用文档">
            <span className={styles.headerIcon}>
              <BookOutlined />
            </span>
          </Tooltip>
          <Tooltip title="语言与地区">
            <span className={styles.headerIcon}>
              <GlobalOutlined />
            </span>
          </Tooltip>
          <span className={styles.userAvatar} aria-hidden="true">
            A
          </span>
          <span className={styles.userName}>Admin User</span>
        </div>
      </header>

      <Layout className={styles.workArea} hasSider>
        <Sider
          className={styles.sider}
          theme="light"
          width={248}
          collapsedWidth={64}
          collapsed={siderCollapsed}
          collapsible
          trigger={null}
          breakpoint="lg"
          onBreakpoint={setSiderCollapsed}
        >
          <div className={styles.sidebarHeader}>
            {!siderCollapsed ? (
              <div className={styles.sidebarContext}>
                <strong>{sidebarConfig.scopeLabel}</strong>
              </div>
            ) : null}
            <Button
              className={styles.collapseButton}
              type="text"
              aria-label={siderCollapsed ? '展开侧栏' : '收起侧栏'}
              icon={
                siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
              }
              onClick={() => setSiderCollapsed((current) => !current)}
            />
          </div>
          <Menu
            key={activeKey}
            className={styles.sidebarMenu}
            mode="inline"
            inlineCollapsed={siderCollapsed}
            inlineIndent={16}
            selectedKeys={[sidebarConfig.selectedKey]}
            items={sidebarConfig.items}
          />
          {!siderCollapsed ? (
            <div className={styles.permissionScope}>
              <span>当前权限范围</span>
              <strong>{sidebarConfig.permissionLabel}</strong>
              <small>静态菜单演示</small>
            </div>
          ) : null}
        </Sider>

        <Layout className={styles.mainColumn}>
          <nav className={styles.workspaceRail} aria-label="工作区标签">
            <Tabs
              className={styles.workspaceTabs}
              type="editable-card"
              hideAdd
              activeKey={activeKey}
              items={tabItems}
              onChange={(key) => setActiveKey(key as DemoTabKey)}
              onEdit={handleEdit}
            />
          </nav>

          <Content className={styles.content}>
            <main id="workspace-main" className={styles.contentViewport}>
              {activePage}
            </main>
          </Content>
        </Layout>
      </Layout>
    </div>
  );
};

export default WorkspaceTabsDemo;
