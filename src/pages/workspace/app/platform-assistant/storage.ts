/**
 * pAI 浏览器持久化边界：
 * 保存会话元数据与稳定消息快照；读取时重新校验消息、来源和状态，
 * 将中断的流式状态恢复为 abort，避免损坏 localStorage 阻断页面启动。
 */
import type { DefaultMessageInfo, MessageInfo } from '@ant-design/x-sdk';
import { normalizeMessageSources } from './sourceProtocol';
import type {
  PaiChatMessage,
  PaiConversation,
  PaiStoredConversation,
  PaiWorkspaceState,
} from './types';

export const PAI_STORAGE_VERSION = 1 as const;
const MAX_CONVERSATIONS = 30;
const MAX_MESSAGES_PER_CONVERSATION = 200;
type PaiMessageStatus = MessageInfo<PaiChatMessage>['status'];
const STABLE_MESSAGE_STATUSES = new Set<PaiMessageStatus>([
  'local',
  'success',
  'error',
  'abort',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isMessageRole = (value: unknown): value is PaiChatMessage['role'] =>
  value === 'user' || value === 'assistant';

const isMessageStatus = (value: unknown): value is PaiMessageStatus =>
  typeof value === 'string' &&
  (
    ['local', 'loading', 'updating', 'success', 'error', 'abort'] as const
  ).includes(value as PaiMessageStatus);

const normalizeChatMessage = (value: unknown): PaiChatMessage | undefined => {
  if (
    !isRecord(value) ||
    !isMessageRole(value.role) ||
    typeof value.content !== 'string'
  ) {
    return undefined;
  }

  const sources = normalizeMessageSources(value.sources);
  return {
    role: value.role,
    content: value.content,
    ...(sources ? { sources } : {}),
  };
};

const normalizeMessageInfo = (
  value: unknown,
): MessageInfo<PaiChatMessage> | undefined => {
  if (
    !isRecord(value) ||
    (typeof value.id !== 'string' && typeof value.id !== 'number') ||
    !isMessageStatus(value.status)
  ) {
    return undefined;
  }

  const message = normalizeChatMessage(value.message);
  if (!message) return undefined;

  return {
    id: value.id,
    message,
    // 浏览器可能在流式响应中途关闭；恢复后显示“已停止”，不伪装成仍在生成。
    status: STABLE_MESSAGE_STATUSES.has(value.status) ? value.status : 'abort',
  };
};

const normalizeConversation = (
  value: unknown,
): PaiStoredConversation | undefined => {
  if (
    !isRecord(value) ||
    typeof value.key !== 'string' ||
    typeof value.label !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    typeof value.isDraft !== 'boolean' ||
    !Array.isArray(value.messages)
  ) {
    return undefined;
  }

  const conversation: PaiStoredConversation = {
    key: value.key,
    label: value.label,
    updatedAt: value.updatedAt,
    isDraft: value.isDraft,
    messages: value.messages
      .map(normalizeMessageInfo)
      .filter((message): message is MessageInfo<PaiChatMessage> =>
        Boolean(message),
      )
      .slice(-MAX_MESSAGES_PER_CONVERSATION),
  };
  return conversation;
};

/** 用用户与 Workspace Scope 共同隔离浏览器中的临时会话。 */
export const buildPaiStorageKey = (userId: string, scopeKey: string) =>
  `pai:v1:${encodeURIComponent(userId)}:${encodeURIComponent(scopeKey)}`;

const createConversationId = () => {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `conversation-${randomPart}`;
};

export const createPaiConversation = (): PaiStoredConversation => {
  const now = new Date().toISOString();
  return {
    key: createConversationId(),
    label: '新对话',
    updatedAt: now,
    isDraft: true,
    messages: [],
  };
};

/** useXConversations 只管理会话元数据，消息交由 useXChat 独立管理。 */
export const toPaiConversation = ({
  messages: _messages,
  ...conversation
}: PaiStoredConversation): PaiConversation => conversation;

/**
 * localStorage 中的 id 只属于上一次 useXChat 运行期，不能再次注入 SDK。
 * 恢复时仅保留消息与状态，让 useXChat 重新分配 default_* 标识，避免它与
 * 新请求从 msg_0 开始生成的标识冲突并同时更新多个气泡。
 */
export const toPaiDefaultMessages = (
  messages: MessageInfo<PaiChatMessage>[],
): DefaultMessageInfo<PaiChatMessage>[] =>
  messages.map(({ message, status }) => ({ message, status }));

export const createEmptyPaiWorkspaceState = (): PaiWorkspaceState => {
  const conversation = createPaiConversation();
  return {
    version: PAI_STORAGE_VERSION,
    activeConversationKey: conversation.key,
    conversations: [conversation],
  };
};

const getBrowserStorage = (): Storage | undefined =>
  typeof window === 'undefined' ? undefined : window.localStorage;

/**
 * 从 localStorage 恢复并校验状态。
 * localStorage 只是本周前端演示的持久化边界，不能作为正式审查记录或跨设备数据源。
 */
export const loadPaiWorkspaceState = (
  storageKey: string,
  storage: Storage | undefined = getBrowserStorage(),
): PaiWorkspaceState => {
  if (!storage) return createEmptyPaiWorkspaceState();

  try {
    const rawState = storage.getItem(storageKey);
    if (!rawState) return createEmptyPaiWorkspaceState();

    const parsedState: unknown = JSON.parse(rawState);
    if (
      !isRecord(parsedState) ||
      parsedState.version !== PAI_STORAGE_VERSION ||
      typeof parsedState.activeConversationKey !== 'string' ||
      !Array.isArray(parsedState.conversations)
    ) {
      return createEmptyPaiWorkspaceState();
    }

    const conversations = parsedState.conversations
      .map(normalizeConversation)
      .filter((conversation): conversation is PaiStoredConversation =>
        Boolean(conversation),
      )
      .slice(0, MAX_CONVERSATIONS);
    if (conversations.length === 0) return createEmptyPaiWorkspaceState();

    const activeConversationKey = conversations.some(
      ({ key }) => key === parsedState.activeConversationKey,
    )
      ? parsedState.activeConversationKey
      : conversations[0].key;

    return {
      version: PAI_STORAGE_VERSION,
      activeConversationKey,
      conversations,
    };
  } catch {
    // 隐私模式、容量限制或损坏 JSON 都不应阻断助手页面。
    return createEmptyPaiWorkspaceState();
  }
};

/**
 * 写入前把临时 streaming 状态转换为 abort，确保任意时刻刷新都能恢复为稳定界面。
 */
export const savePaiWorkspaceState = (
  storageKey: string,
  state: PaiWorkspaceState,
  storage: Storage | undefined = getBrowserStorage(),
) => {
  if (!storage) return;

  const serializableState: PaiWorkspaceState = {
    ...state,
    conversations: state.conversations
      .slice(0, MAX_CONVERSATIONS)
      .map((conversation) => ({
        ...conversation,
        messages: conversation.messages
          .slice(-MAX_MESSAGES_PER_CONVERSATION)
          .map((message) => ({
            ...message,
            status: STABLE_MESSAGE_STATUSES.has(message.status)
              ? message.status
              : 'abort',
          })),
      })),
  };

  try {
    // 每次覆盖当前 workspace 的完整快照，删除的会话不会残留在旧数组中。
    storage.setItem(storageKey, JSON.stringify(serializableState));
  } catch {
    // 临时持久化失败时保留当前内存会话；正式后端接入后由请求错误层统一反馈。
  }
};
