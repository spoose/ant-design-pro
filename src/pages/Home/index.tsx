import { useLocation, useModel, useParams } from '@umijs/max';
import WorkspacePage from '@/components/WorkspacePage';
import { WorkspaceHomeModules } from '@/pages/workspace/overview/WorkspaceHomeModules';
import { PlatformWelcomeAvatar } from '@/pages/workspace/platform/overview/PlatformWelcomeAvatar';
import { getPlatformWelcomeHeading } from '@/pages/workspace/platform/overview/welcome';
import { buildWorkspaceBreadcrumb } from '@/utils/menuData';
import { getOrganizationAppPagePath } from '@/utils/workspaceRoutes';
import { getOrganizationAccess } from '@/utils/workspaceRules';

const Home: React.FC = () => {
  const { pathname } = useLocation();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  // organizationId 来自 URL；用户、权限和 appCodes 均来自认证适配后的会话。
  const { organizationId } = useParams<{ organizationId?: string }>();
  const organizationAccess =
    currentUser && organizationId
      ? getOrganizationAccess(currentUser, organizationId)
      : undefined;
  const organization = organizationAccess?.organization;
  const pageHeading = getPlatformWelcomeHeading({
    isSuperAdmin: currentUser?.isSuperAdmin,
    userName: currentUser?.name,
  });

  return (
    <WorkspacePage
      breadcrumb={buildWorkspaceBreadcrumb(currentUser, pathname, ['首页'])}
      description={pageHeading.description}
      leading={
        currentUser ? (
          <PlatformWelcomeAvatar
            avatar={currentUser.avatar}
            userName={currentUser.name}
          />
        ) : undefined
      }
      title={pageHeading.title}
    >
      {organization ? (
        <div className="grid gap-5">
          <WorkspaceHomeModules
            appTitle="组织应用"
            emptyDescription="当前组织暂无可用应用，请联系组织管理员授权。"
            getAppPath={(appCode) =>
              getOrganizationAppPagePath(
                organization.organizationId,
                appCode,
                'overview',
              )
            }
            appCodes={organizationAccess.availableAppCodes}
          />
        </div>
      ) : (
        <div role="alert" className="text-sm text-red-700 dark:text-red-300">
          未找到当前组织
        </div>
      )}
    </WorkspacePage>
  );
};

export default Home;
