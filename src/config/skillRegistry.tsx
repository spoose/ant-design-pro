import {
  AuditOutlined,
  DatabaseOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FolderOutlined,
  HistoryOutlined,
  InboxOutlined,
  OllamaFilled,
  RobotOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type React from 'react';
import { lazy } from 'react';

export type SkillPageProps = {
  /** Skill 内部页面 Key，来源于 Workspace App URL。 */
  pageKey?: string;
};

export type SkillNavigationItem = {
  /**
   * Skill 内稳定的子页面标识；所有菜单都使用并列路径，避免 App 根路径同时命中子页面。
   */
  pathSegment: string;
  /** 左侧菜单展示名称，不重复 Skill 名称。 */
  title: string;
  /** 左侧菜单使用的 Ant Design 图标组件。 */
  icon: React.ComponentType<{ className?: string }>;
  /** 尚未实现的页面由 Workspace App 统一渲染占位内容。 */
  placeholder?: boolean;
};

export type SkillDefinition = {
  /** Skill 在卡片和标签页中显示的前端名称。 */
  title: string;
  /** Skill 卡片使用的 Ant Design 图标组件。 */
  icon: React.ComponentType<{ className?: string }>;
  /**
   * 已实现的 Skill 页面按需加载组件；未配置时统一进入明确的待开发占位页。
   */
  pageComponent?: React.LazyExoticComponent<
    React.ComponentType<SkillPageProps>
  >;
  /**
   * 当前 Skill 独立 Sidebar 的静态页面定义。
   * 数据链路：skillCode -> SkillDefinition.navigation -> menuData -> ProLayout Sidebar。
   */
  navigation: readonly SkillNavigationItem[];
};

/**
 * 前端静态 Skill Registry：后端只返回稳定的 skillCode，这里维护名称、图标、导航和页面实现。
 * Organization App 路由必须包含 organizationId，由 workspaceRoutes 根据当前 Scope 生成。
 * 后续增加 Skill 时需同步更新该表；OpenAPI 只生成授权数据，不生成 React 组件配置。
 */
export const skillRegistry = {
  'ai-assistant': {
    title: 'pAI',
    icon: OllamaFilled,
    pageComponent: lazy(() => import('@/pages/workspace/app/ai-assistant')),
    navigation: [
      {
        pathSegment: 'overview',
        title: '通用助手',
        icon: RobotOutlined,
      },
      {
        pathSegment: 'resources',
        title: '资源',
        icon: FolderOutlined,
        placeholder: true,
      },
      {
        pathSegment: 'memory',
        title: '记忆',
        icon: HistoryOutlined,
        placeholder: true,
      },
    ],
  },
  'file-review': {
    title: '文件审查',
    icon: AuditOutlined,
    pageComponent: lazy(() => import('@/pages/workspace/app/file-review')),
    navigation: [
      {
        pathSegment: 'overview',
        title: '审查工作台',
        icon: AuditOutlined,
      },
      { pathSegment: 'queue', title: '待审文件', icon: InboxOutlined },
      { pathSegment: 'history', title: '审查记录', icon: HistoryOutlined },
    ],
  },
  'document-summary': {
    title: '文档总结',
    icon: FileTextOutlined,
    navigation: [
      {
        pathSegment: 'overview',
        title: '总结工作台',
        icon: FileTextOutlined,
      },
      { pathSegment: 'tasks', title: '文档任务', icon: FileDoneOutlined },
      { pathSegment: 'history', title: '生成记录', icon: HistoryOutlined },
    ],
  },
  'knowledge-search': {
    title: '知识检索',
    icon: FileSearchOutlined,
    pageComponent: lazy(() => import('@/pages/workspace/app/knowledge-search')),
    navigation: [
      {
        pathSegment: 'overview',
        title: '搜索工作台',
        icon: SearchOutlined,
      },
      { pathSegment: 'sources', title: '知识库', icon: DatabaseOutlined },
      { pathSegment: 'history', title: '搜索记录', icon: HistoryOutlined },
    ],
  },
} as const satisfies Record<string, SkillDefinition>;

export type SkillCode = keyof typeof skillRegistry;

/** 将后端 skillCode 解析为前端可渲染定义；未知代码显式返回 undefined。 */
export const getSkillDefinition = (
  skillCode: string,
): SkillDefinition | undefined => skillRegistry[skillCode as SkillCode];
