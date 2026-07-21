import { useModel, useParams } from '@umijs/max';
import WorkspacePage from '@/components/WorkspacePage';

/** Organization 首页固定标签内的设置占位页；本阶段只确认路由和 Sidebar 行为。 */
const OrganizationSettingsPage = () => {
  const { initialState } = useModel('@@initialState');
  const { organizationId } = useParams<{ organizationId?: string }>();
  const organization = initialState?.currentUser?.organizations.find(
    (item) => item.organizationId === organizationId,
  );

  return (
    <WorkspacePage
      breadcrumb={[organization?.organizationName ?? '当前组织', '组织设置']}
      title="组织设置"
      description="维护当前组织的基础信息与工作区设置。"
    >
      <div className="border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        设置表单将在接入 Organization API
        后补充；当前页面用于验证首页标签内导航不会创建新标签。
      </div>
    </WorkspacePage>
  );
};

export default OrganizationSettingsPage;
