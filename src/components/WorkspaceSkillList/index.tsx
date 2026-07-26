import { Link } from '@umijs/max';
import { useState } from 'react';
import { getSkillDefinition } from '@/config/skillRegistry';
import { WorkspaceSkillArt } from './SkillArt';

/** 折叠时最多展示的应用卡数量；超出后以三点按钮展开其余。 */
const SKILL_PREVIEW_COUNT = 3;

/** 启动卡默认说明；可按 skillCode 覆盖，不进入 Skill Registry。 */
const defaultSkillDescriptions: Record<string, string> = {
  'platform-assistant': '用平台助手处理日常管理与协作任务。',
  'file-review': '从空白开始，或让助手引导你完成审查。',
  'document-summary': '自动提炼文档要点，生成可读摘要。',
  'knowledge-search': '在知识库中检索资料与答案。',
};

const skillCardClassName =
  'group relative flex h-40 w-[min(22rem,calc(100%-2.5rem))] shrink-0 snap-start overflow-hidden rounded-[1.25rem] border border-zinc-200/80 !bg-white text-inherit shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[background-color,border-color] hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 active:bg-zinc-100 motion-reduce:transition-none dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none dark:hover:border-zinc-600 dark:hover:bg-zinc-800/90 dark:active:bg-zinc-800';

export type WorkspaceSkillListProps = {
  /** 当前 Scope 的有效 Skill Code；来源于 GET /api/currentUser 的后端过滤结果。 */
  skillCodes: string[];
  /** 把 Skill Code 转成当前 Platform/Organization Scope 下的 App URL。 */
  getSkillPath: (skillCode: string) => string;
  /** 区分 Platform 与 Organization 场景的区块标题。 */
  title: string;
  /** 当前 Scope 没有可用 Skill 时向用户解释原因的文字。 */
  emptyDescription: string;
  /** 可选：覆盖默认启动卡说明文案。 */
  descriptions?: Record<string, string>;
};

/** 单个 Skill 启动卡。 */
const WorkspaceSkillCard = ({
  skillCode,
  getSkillPath,
  descriptions,
}: {
  skillCode: string;
  getSkillPath: (skillCode: string) => string;
  descriptions: Record<string, string>;
}) => {
  const definition = getSkillDefinition(skillCode);

  if (!definition) {
    return (
      <div
        className="h-40 w-[min(22rem,calc(100%-2.5rem))] shrink-0 snap-start rounded-[1.25rem] bg-red-50 px-5 py-5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
        role="alert"
      >
        未注册 Skill：<code>{skillCode}</code>
      </div>
    );
  }

  const description =
    descriptions[skillCode] ?? `打开 ${definition.title}，继续当前工作区工作。`;

  return (
    <Link
      aria-label={`打开 ${definition.title}`}
      className={skillCardClassName}
      to={getSkillPath(skillCode)}
    >
      <span className="relative z-10 flex h-full w-[58%] min-w-0 flex-col justify-between p-5 pr-2">
        <strong className="text-lg font-semibold leading-snug text-balance text-zinc-950 dark:text-zinc-50">
          {definition.title}
        </strong>
        <span className="text-sm leading-6 text-pretty text-zinc-500 dark:text-zinc-400">
          {description}
        </span>
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-[52%] translate-x-2 opacity-95 transition-transform duration-200 group-hover:translate-x-0 motion-reduce:transition-none dark:opacity-80"
      >
        <WorkspaceSkillArt skillCode={skillCode} />
      </span>
    </Link>
  );
};

/**
 * Platform 与 Organization 共用的 Skill 启动条。
 *
 * 数据链路：currentUser 中当前 Scope 的 skillCodes -> skillRegistry 展示信息
 * -> workspaceRoutes 生成 URL -> Umi Link -> WorkspaceTabsHeader 创建或激活 App 标签。
 */
const WorkspaceSkillList = ({
  skillCodes,
  getSkillPath,
  title,
  emptyDescription,
  descriptions,
}: WorkspaceSkillListProps) => {
  const [expanded, setExpanded] = useState(false);
  const resolvedDescriptions = { ...defaultSkillDescriptions, ...descriptions };
  const hasOverflow = skillCodes.length > SKILL_PREVIEW_COUNT;
  const visibleSkillCodes =
    hasOverflow && !expanded
      ? skillCodes.slice(0, SKILL_PREVIEW_COUNT)
      : skillCodes;
  const hiddenCount = skillCodes.length - SKILL_PREVIEW_COUNT;

  return (
    <section
      aria-labelledby="workspace-skills-title"
      className="grid min-w-0 gap-3"
    >
      <header className="flex items-center justify-between gap-3">
        <h2
          className="m-0 text-base font-semibold text-zinc-950 dark:text-zinc-50"
          id="workspace-skills-title"
        >
          {title}
        </h2>
        <div className="flex shrink-0 items-center gap-3">
          {hasOverflow && expanded ? (
            <button
              className="border-0 bg-transparent p-0 text-xs text-orange-600 transition-colors hover:text-orange-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 motion-reduce:transition-none dark:text-orange-400 dark:hover:text-orange-300"
              onClick={() => setExpanded(false)}
              type="button"
            >
              收起
            </button>
          ) : null}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {skillCodes.length} 项
          </span>
        </div>
      </header>

      {skillCodes.length ? (
        <section
          aria-label={`${title}卡片，可左右滑动`}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]"
        >
          {visibleSkillCodes.map((skillCode) => (
            <WorkspaceSkillCard
              descriptions={resolvedDescriptions}
              getSkillPath={getSkillPath}
              key={skillCode}
              skillCode={skillCode}
            />
          ))}

          {hasOverflow && !expanded ? (
            <button
              aria-expanded={false}
              aria-label={`更多，还有 ${hiddenCount} 个应用`}
              className="flex h-40 w-10 shrink-0 snap-start cursor-pointer flex-col items-center justify-center gap-1.5 border-0 bg-transparent p-0 text-zinc-800 transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 motion-reduce:transition-none dark:text-zinc-200"
              onClick={() => setExpanded(true)}
              type="button"
            >
              <span aria-hidden className="size-1.5 rounded-full bg-current" />
              <span aria-hidden className="size-1.5 rounded-full bg-current" />
              <span aria-hidden className="size-1.5 rounded-full bg-current" />
            </button>
          ) : null}
        </section>
      ) : (
        <p className="m-0 rounded-[1.25rem] border border-zinc-200/80 bg-white px-5 py-8 text-sm leading-6 text-zinc-500 shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none dark:text-zinc-400">
          {emptyDescription}
        </p>
      )}
    </section>
  );
};

export default WorkspaceSkillList;
