import { Link } from '@umijs/max';
import { Card, Empty } from 'antd';
import { getSkillDefinition } from '@/config/skillRegistry';

export type WorkspaceSkillListProps = {
  /** 当前 Scope 的有效 Skill Code；来源于 GET /api/currentUser 的后端过滤结果。 */
  skillCodes: string[];
  /** 把 Skill Code 转成当前 Platform/Organization Scope 下的 App URL。 */
  getSkillPath: (skillCode: string) => string;
  /** 区分 Platform 与 Organization 场景的区块标题。 */
  title: string;
  /** 当前 Scope 没有可用 Skill 时向用户解释原因的文字。 */
  emptyDescription: string;
};

/**
 * Platform 与 Organization 共用的 Skill 入口。
 *
 * 数据链路：currentUser 中当前 Scope 的 skillCodes -> skillRegistry 展示信息
 * -> workspaceRoutes 生成 URL -> Umi Link -> WorkspaceTabsHeader 创建或激活 App 标签。
 */
const WorkspaceSkillList = ({
  skillCodes,
  getSkillPath,
  title,
  emptyDescription,
}: WorkspaceSkillListProps) => (
  <section aria-labelledby="workspace-skills-title">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2
        className="m-0 text-base font-semibold text-zinc-950 dark:text-zinc-50"
        id="workspace-skills-title"
      >
        {title}
      </h2>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {skillCodes.length} 项
      </span>
    </div>

    {skillCodes.length ? (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {skillCodes.map((skillCode) => {
          const definition = getSkillDefinition(skillCode);

          if (!definition) {
            return (
              <Card
                className="h-full border-red-300"
                key={skillCode}
                size="small"
              >
                <div
                  role="alert"
                  className="text-sm text-red-700 dark:text-red-300"
                >
                  未注册 Skill：<code>{skillCode}</code>
                </div>
              </Card>
            );
          }

          const SkillIcon = definition.icon;
          return (
            <Link
              aria-label={`打开 ${definition.title}`}
              className="block h-full rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              key={skillCode}
              to={getSkillPath(skillCode)}
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
        })}
      </div>
    ) : (
      <div className="border border-zinc-200 bg-white px-4 py-8 dark:border-zinc-800 dark:bg-zinc-900">
        <Empty
          description={emptyDescription}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    )}
  </section>
);

export default WorkspaceSkillList;
