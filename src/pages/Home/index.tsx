import { useLocation, useModel, useParams } from '@umijs/max';
import { CurrentAccessOverview } from '@/components/CurrentAccessOverview';
import WorkspacePage from '@/components/WorkspacePage';
import { buildWorkspaceBreadcrumb } from '@/utils/menuData';

const Home: React.FC = () => {
  const { pathname } = useLocation();
  const { initialState } = useModel('@@initialState');
  // organizationId 来自 URL；用户、权限和 Skill 均来自 POST /api/currentUser/get。
  const { organizationId } = useParams<{ organizationId?: string }>();
  const organization = initialState?.currentUser?.organizations.find(
    (candidate) => candidate.organizationId === organizationId,
  );

  return (
    <WorkspacePage
      breadcrumb={buildWorkspaceBreadcrumb(
        initialState?.currentUser,
        pathname,
        ['组织首页'],
      )}
      title="组织首页"
      description="从当前组织首页进入应用；应用会在独立工作标签中打开。"
    >
      {organization ? (
        <CurrentAccessOverview organization={organization} />
      ) : (
        <div role="alert" className="text-sm text-red-700 dark:text-red-300">
          未找到当前组织
        </div>
      )}
    </WorkspacePage>
  );
};

export default Home;
