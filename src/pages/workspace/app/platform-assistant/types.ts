/**
 * pAI 前端领域模型：
 * MessageSource 描述消息引用的通用来源，PaiChatMessage 交给 X SDK 流式更新，
 * 会话与工作区类型则作为 useXChat、useXConversations 和 localStorage 的契约。
 */
import type { MessageInfo, XModelMessage } from '@ant-design/x-sdk';

export type MessageSource = {
  sourceId: string;
  sourceType: 'knowledge' | 'web';
  title: string;
  sourceUrl?: string;
  snippet?: string;
  publishedAt?: string;
  updatedAt?: string;
};

/**
 * useXChat 与 DeepSeekChatProvider 共同消费的消息正文。
 * id 和 status 由 X SDK 的 MessageInfo 管理，不在业务消息内重复定义。
 */
export interface PaiChatMessage extends XModelMessage {
  role: 'user' | 'assistant';
  content: string;
  /** 后端提供的候选来源；回答完成后再按模型实际引用派生展示列表。 */
  sources?: MessageSource[];
}

export type PaiConversation = {
  /** 会话稳定 ID，同时作为 useXChat.conversationKey 与 Conversations.activeKey。 */
  key: string;
  label: string;
  updatedAt: string;
  /** 草稿会话在首次提问后使用问题摘要替换默认标题。 */
  isDraft: boolean;
};

/** localStorage 中会话元数据与 X SDK 消息快照的组合。 */
export type PaiStoredConversation = PaiConversation & {
  messages: MessageInfo<PaiChatMessage>[];
};

export type PaiWorkspaceState = {
  version: 1;
  /** 当前活动会话，是 useXConversations 与 useXChat 之间的连接键。 */
  activeConversationKey: string;
  conversations: PaiStoredConversation[];
};
