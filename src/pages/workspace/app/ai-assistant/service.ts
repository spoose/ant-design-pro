import type { DefaultMessageInfo } from '@ant-design/x-sdk';
import { request } from '@umijs/max';
import type { WorkspaceScope } from '@/utils/workspaceState';
import type { MessageSource, PaiChatMessage, PaiConversation } from './types';

type ApiSuccess<T> = {
  success: true;
  data: T;
  traceId: string;
};

type ConversationScope =
  | { type: 'platform' }
  | { type: 'organization'; organizationId: string };

export type PaiConversationSummary = {
  conversationId: string;
  ownerUserId: string;
  scope: ConversationScope;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type PaiMessageResponse = {
  messageId: string;
  role: 'user' | 'assistant';
  status: 'pending' | 'streaming' | 'completed' | 'failed' | 'aborted';
  content: string;
  createdAt: string;
  completedAt: string | null;
  sources: Array<
    Omit<MessageSource, 'updatedAt'> & { sourceUpdatedAt?: string | null }
  >;
};

type PaiConversationHistory = {
  conversation: PaiConversationSummary;
  turns: Array<{
    runId: string;
    turnNo: number;
    status: 'pending' | 'streaming' | 'completed' | 'failed' | 'aborted';
    errorCode: string | null;
    messages: PaiMessageResponse[];
  }>;
};

const runErrorMessages: Record<string, string> = {
  AI_MODEL_UNAVAILABLE: '模型服务暂时不可用',
  KNOWLEDGE_BASE_UNAVAILABLE: '知识库暂时不可用',
  CONVERSATION_UNAVAILABLE: '会话不可用',
};

const getRunErrorMessage = (errorCode: string | null) =>
  errorCode ? (runErrorMessages[errorCode] ?? errorCode) : undefined;

const toScopeQuery = (scope: WorkspaceScope) =>
  scope.kind === 'platform'
    ? { scopeType: 'platform' as const }
    : {
        scopeType: 'organization' as const,
        organizationId: scope.organizationId,
      };

export const toPaiConversation = (
  conversation: PaiConversationSummary,
): PaiConversation => ({
  key: conversation.conversationId,
  label: conversation.title,
  updatedAt: conversation.updatedAt,
});

const toMessageStatus = (
  message: PaiMessageResponse,
): DefaultMessageInfo<PaiChatMessage>['status'] => {
  if (message.role === 'user') return 'local';
  if (message.status === 'failed') return 'error';
  if (message.status === 'aborted') return 'abort';
  if (message.status === 'pending') return 'loading';
  if (message.status === 'streaming') return 'updating';
  return 'success';
};

/**
 * 数据库 History 是唯一持久化来源；这里只把后端状态投影为 X SDK 的显示状态，
 * 不补造缺失消息，也不把 reasoning 恢复到助手正文。
 */
export const toPaiDefaultMessages = (
  history: PaiConversationHistory,
): DefaultMessageInfo<PaiChatMessage>[] =>
  history.turns.flatMap((turn) =>
    turn.messages.map((message) => ({
      id: message.messageId,
      status: toMessageStatus(message),
      message: {
        role: message.role,
        content: message.content,
        ...(message.role === 'assistant' && message.status === 'failed'
          ? {
              terminalStatus: 'failed' as const,
              errorMessage: getRunErrorMessage(turn.errorCode),
            }
          : {}),
        ...(message.sources.length
          ? {
              sources: message.sources.map(
                ({ sourceUpdatedAt, ...source }) => ({
                  ...source,
                  ...(sourceUpdatedAt ? { updatedAt: sourceUpdatedAt } : {}),
                }),
              ),
            }
          : {}),
      },
    })),
  );

export async function listPaiConversations(scope: WorkspaceScope) {
  return request<ApiSuccess<PaiConversationSummary[]>>(
    '/api/pai/conversations',
    {
      method: 'GET',
      params: { ...toScopeQuery(scope), limit: 30 },
    },
  );
}

export async function createPaiConversation(
  scope: WorkspaceScope,
  title: string,
) {
  return request<ApiSuccess<PaiConversationSummary>>('/api/pai/conversations', {
    method: 'POST',
    data: { ...toScopeQuery(scope), title },
  });
}

export async function getPaiConversationHistory(conversationId: string) {
  return request<ApiSuccess<PaiConversationHistory>>(
    `/api/pai/conversations/${encodeURIComponent(conversationId)}`,
    { method: 'GET' },
  );
}

export async function updatePaiConversationTitle(
  conversationId: string,
  title: string,
) {
  return request<ApiSuccess<PaiConversationSummary>>(
    `/api/pai/conversations/${encodeURIComponent(conversationId)}`,
    { method: 'PATCH', data: { title } },
  );
}

export async function deletePaiConversation(conversationId: string) {
  return request<ApiSuccess<{ deleted: true }>>(
    `/api/pai/conversations/${encodeURIComponent(conversationId)}`,
    { method: 'DELETE' },
  );
}

/** 旧浏览器历史不迁移；升级后一次性删除所有 pAI v1 快照。 */
export function clearLegacyPaiStorage(storage: Storage = window.localStorage) {
  const keys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).filter((key): key is string => Boolean(key?.startsWith('pai:v1:')));
  for (const key of keys) storage.removeItem(key);
}
