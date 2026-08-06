/**
 * pAI 前端领域模型：
 * MessageSource 描述消息引用的通用来源，PaiChatMessage 交给 X SDK 流式更新，
 * 会话类型作为 useXChat、useXConversations 与后端会话 API 的前端契约。
 */
import type { XModelMessage } from '@ant-design/x-sdk';

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
 * useXChat 与 PaiChatProvider 共同消费的消息正文。
 * id 和 status 由 X SDK 的 MessageInfo 管理，不在业务消息内重复定义。
 */
export interface PaiChatMessage extends XModelMessage {
  role: 'user' | 'assistant';
  content: string;
  /** 后端提供的候选来源；回答完成后再按模型实际引用派生展示列表。 */
  sources?: MessageSource[];
  /** SSE error/done 的终态，用于在 HTTP 200 流中显示明确的失败或中止状态。 */
  terminalStatus?: 'completed' | 'failed' | 'aborted';
  errorMessage?: string;
}

export type PaiConversation = {
  /** 会话稳定 ID，同时作为 useXChat.conversationKey 与 Conversations.activeKey。 */
  key: string;
  label: string;
  updatedAt: string;
};

/** useXChat 的本地消息参数和后端 Run 请求共用这一输入。 */
export type PaiRunRequest = {
  messages?: PaiChatMessage[];
  idempotencyKey?: string;
  content?: string;
  knowledgeEnabled?: boolean;
  webSearchEnabled?: boolean;
};
