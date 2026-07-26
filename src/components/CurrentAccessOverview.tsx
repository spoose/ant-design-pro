import type { OrganizationAccess } from '@/services/auth';
import { getOrganizationAppPagePath } from '@/utils/workspaceRoutes';
import WorkspaceSkillList from './WorkspaceSkillList';

/** 展示当前 Organization 的权限和后端已过滤的可用 Skill。 */
export const CurrentAccessOverview: React.FC<{
  organization: OrganizationAccess;
}> = ({ organization }) => (
  <>
    <section
      aria-labelledby="current-access-title"
      className="grid gap-5 border-b border-zinc-200 pb-6 dark:border-zinc-800 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]"
    >
      <div>
        <h2
          className="m-0 text-sm font-semibold text-zinc-500 dark:text-zinc-400"
          id="current-access-title"
        >
          当前组织
        </h2>
        <div className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          {organization.organizationName}
        </div>
        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          {organization.organizationCode}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            当前权限
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {organization.permissions.length} 项
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {organization.permissions.map((permission) => (
            <code
              className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              key={permission}
            >
              {permission}
            </code>
          ))}
        </div>
      </div>
    </section>

    <div className="mt-6">
      <WorkspaceSkillList
        emptyDescription="当前组织暂无可用应用，请联系组织管理员授权。"
        getSkillPath={(skillCode) =>
          getOrganizationAppPagePath(
            organization.organizationId,
            skillCode,
            'overview',
          )
        }
        skillCodes={organization.skillCodes}
        title="组织应用"
      />
    </div>
  </>
);
