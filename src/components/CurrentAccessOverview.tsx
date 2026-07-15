import { Link } from '@umijs/max';
import { Card } from 'antd';
import { getSkillDefinition } from '@/config/skillRegistry';
import type { AccessContext } from '@/services/auth';

const SkillCard: React.FC<{ skillCode: string }> = ({ skillCode }) => {
  const definition = getSkillDefinition(skillCode);

  if (!definition) {
    return (
      <Card className="h-full border-red-300" size="small">
        <div role="alert" className="text-sm text-red-700 dark:text-red-300">
          未注册 Skill：<code>{skillCode}</code>
        </div>
      </Card>
    );
  }

  const SkillIcon = definition.icon;
  return (
    <Link
      aria-label={`打开 ${definition.title}`}
      className="block h-full"
      to={definition.path}
    >
      <Card className="h-full" hoverable size="small">
        <div className="flex min-h-20 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <SkillIcon className="text-base" />
          </div>
          <div className="grid min-w-0 flex-1 gap-1">
            <h3 className="m-0 text-sm font-semibold leading-[1.4] text-zinc-900 dark:text-zinc-100">
              {definition.title}
            </h3>
            <code className="m-0 [overflow-wrap:anywhere] text-xs leading-normal text-zinc-500 dark:text-zinc-400">
              {skillCode}
            </code>
          </div>
        </div>
      </Card>
    </Link>
  );
};

/** 展示当前 Context 的系统范围、权限和后端已过滤的可用 Skill。 */
export const CurrentAccessOverview: React.FC<{ context: AccessContext }> = ({
  context,
}) => (
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
          当前访问范围
        </h2>
        <div className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          {context.systemName}
        </div>
        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          {context.scopeName ?? context.systemCode}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            当前权限
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {context.permissions.length} 项
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {context.permissions.map((permission) => (
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

    <section aria-labelledby="available-skills-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          className="m-0 text-base font-semibold text-zinc-950 dark:text-zinc-50"
          id="available-skills-title"
        >
          可用 Skill
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {context.skillCodes.length} 项
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {context.skillCodes.map((skillCode) => (
          <SkillCard key={skillCode} skillCode={skillCode} />
        ))}
      </div>
    </section>
  </>
);
