import {
  AuditOutlined,
  FileSearchOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type React from 'react';

export type SkillDefinition = {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
};

/**
 * 前端静态 Skill Registry：后端只返回稳定的 skillCode，这里维护名称、图标和静态路由。
 * AI 能力未接入前，各 Skill 统一跳转项目 AI 助手，并通过查询参数保留来源 Skill。
 * 后续增加 Skill 时需同步更新该表；OpenAPI 只生成授权数据，不生成 React 组件配置。
 */
export const skillRegistry = {
  'file-review': {
    title: '文件审查',
    path: '/chatbot?skill=file-review',
    icon: AuditOutlined,
  },
  'document-summary': {
    title: '文档总结',
    path: '/chatbot?skill=document-summary',
    icon: FileTextOutlined,
  },
  'knowledge-search': {
    title: '知识检索',
    path: '/chatbot?skill=knowledge-search',
    icon: FileSearchOutlined,
  },
} as const satisfies Record<string, SkillDefinition>;

export type SkillCode = keyof typeof skillRegistry;

export const getSkillDefinition = (skillCode: string) =>
  skillRegistry[skillCode as SkillCode];
