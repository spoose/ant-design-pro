import { AppstoreOutlined, HomeOutlined } from '@ant-design/icons';
import type { TabsProps } from 'antd';
import { Tabs } from 'antd';
import { getAppDefinition } from '@/config/appRegistry';
import type { WorkspaceTab } from '@/utils/workspaceState';
import useWorkspaceTabsBarStyles from './style';

export type WorkspaceTabsBarProps = {
  /** 来源于 useWorkspaceTabs().tabs，数组顺序就是标签显示顺序。 */
  tabs: WorkspaceTab[];
  /** 来源于当前 Umi routeTab 的稳定 ID，直接绑定 antd activeKey。 */
  activeTabId: string;
  /** antd onChange 返回被点击标签的稳定 ID。 */
  onActivate: (tabId: string) => void;
  /** antd onEdit remove 返回需要关闭的稳定 ID。 */
  onClose: (tabId: string) => void;
};

/**
 * 正式工作区标签栏的纯 UI 层。
 *
 * antd Tabs 负责渲染、键盘语义、溢出和关闭事件；本组件只把 WorkspaceTab
 * 映射成 items，并把 activeKey/onChange/onEdit 转交给 useWorkspaceTabs。
 */
const WorkspaceTabsBar = ({
  tabs,
  activeTabId,
  onActivate,
  onClose,
}: WorkspaceTabsBarProps) => {
  const { styles } = useWorkspaceTabsBarStyles();

  const items: TabsProps['items'] = tabs.map((tab) => {
    const TabIcon =
      tab.kind === 'home'
        ? HomeOutlined
        : (getAppDefinition(tab.appKey)?.icon ?? AppstoreOutlined);

    return {
      key: tab.id,
      icon: (
        <span className={styles.tabIcon} aria-hidden="true">
          <TabIcon />
        </span>
      ),
      label: <span className={styles.labelText}>{tab.title}</span>,
      // antd 标签默认可关闭；当前 Scope 的首页是唯一例外。
      closable: tab.kind !== 'home',
    };
  });

  const handleEdit: TabsProps['onEdit'] = (targetKey, action) => {
    if (action === 'remove' && typeof targetKey === 'string') {
      onClose(targetKey);
    }
  };

  if (!tabs.length) return null;

  return (
    <nav className={styles.rail} aria-label="应用标签">
      <Tabs
        className={styles.tabs}
        type="editable-card"
        size="small"
        hideAdd
        activeKey={activeTabId}
        items={items}
        onChange={onActivate}
        onEdit={handleEdit}
      />
    </nav>
  );
};

export default WorkspaceTabsBar;
