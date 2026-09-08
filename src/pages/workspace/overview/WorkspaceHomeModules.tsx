import WorkspaceAppList from '@/components/WorkspaceAppList';
import PlatformAppCatalog from '../platform/overview/PlatformAppCatalog';
import PlatformMockCalendar from '../platform/overview/PlatformMockCalendar';
import PlatformMockChart from '../platform/overview/PlatformMockChart';
import { PlatformStartConversation } from '../platform/overview/PlatformMockConversations';
import PlatformNotificationCenter from '../platform/overview/PlatformNotificationCenter';
import PlatformQuickEntry from '../platform/overview/PlatformQuickEntry';
import PlatformWeeklyGoals from '../platform/overview/PlatformWeeklyGoals';

export type WorkspaceHomeModulesProps = {
  /** 当前 Scope 实际可用的应用代码；Project 与 Organization 禁止互相合并。 */
  appCodes: string[];
  /** 把应用代码转换为当前 Scope 的 overview URL。 */
  getAppPath: (appCode: string) => string;
  /** 应用卡片区标题，用来标明当前 Project/Organization Scope。 */
  appTitle: string;
  /** 当前 Scope 没有应用授权时展示的明确说明。 */
  emptyDescription: string;
};

/**
 * Project 与 Organization 共用的首页模块。
 * 调用方只提供当前 Scope 的应用、路径和展示文本，不在组件内猜测组织身份。
 */
export const WorkspaceHomeModules = ({
  appCodes,
  getAppPath,
  appTitle,
  emptyDescription,
}: WorkspaceHomeModulesProps) => (
  <>
    {/* ponytail: 21rem 预留欢迎区+快速入口，22rem 封顶；壳层高度变了再改 calc。 */}
    <div className="grid min-h-0 items-stretch gap-5 lg:auto-rows-[22rem] lg:grid-cols-[minmax(0,38rem)_minmax(16rem,24rem)] lg:justify-start xl:h-[min(22rem,_calc(100dvh-56px-21rem))] xl:auto-rows-auto">
      <PlatformStartConversation />
      <PlatformNotificationCenter />
      {/* 每周目标保留供后续恢复；当前不占用首页网格。 */}
      <div aria-hidden="true" className="hidden" hidden>
        <PlatformWeeklyGoals />
      </div>
      {/* 日历保留供后续恢复；当前由通知中心占用原卡槽。 */}
      <div aria-hidden="true" className="hidden" hidden>
        <PlatformMockCalendar />
      </div>
    </div>

    {/* 首页只保留普通快捷入口；管理能力统一从 Project Admin 侧栏进入。 */}
    <PlatformQuickEntry
      appCodes={appCodes}
      getAppPath={getAppPath}
      permissions={[]}
    />

    <PlatformAppCatalog getAppPath={getAppPath} appCodes={appCodes} />

    <WorkspaceAppList
      emptyDescription={emptyDescription}
      getAppPath={getAppPath}
      appCodes={appCodes}
      title={appTitle}
    />

    <PlatformMockChart />
  </>
);
