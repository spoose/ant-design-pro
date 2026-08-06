/**
 * pAI 与 Ant Design X SDK 的协议适配层：
 * 出站时只保留本轮输入、幂等键和能力开关；入站时把本站
 * reasoning/text/sources/done/error 事件合并进同一条 assistant 消息。
 */
import {
  AbstractChatProvider,
  type MessageInfo,
  type SSEOutput,
  type TransformMessage,
  XRequest,
  type XRequestOptions,
} from '@ant-design/x-sdk';
import { getAccessToken } from '@/utils/authToken';
import { parseMessageSourcesEvent } from './sourceProtocol';
import type { PaiChatMessage, PaiRunRequest } from './types';

const getRunEndpoint = (conversationId: string) =>
  `/api/pai/conversations/${encodeURIComponent(conversationId)}/runs`;

const REQUEST_RECONNECT_DELAY_MS = 1_000;
const REQUEST_RECONNECT_TIMES = 3;

const readResponseError = async (response: Response): Promise<Error> => {
  const payload = (await response.json().catch(() => undefined)) as
    | { errorCode?: unknown; errorMessage?: unknown }
    | undefined;
  const message =
    typeof payload?.errorMessage === 'string'
      ? payload.errorMessage
      : `HTTP ${response.status}`;
  const error = new Error(message);
  error.name =
    typeof payload?.errorCode === 'string' ? payload.errorCode : 'HTTP_ERROR';
  return error;
};

/**
 * 只重连没有取得 HTTP 响应的请求。后端已经返回 4xx/5xx 时直接展示其
 * 错误信息，不能以同一幂等键重复执行已经终止的 Run。
 */
const fetchPaiRun: NonNullable<
  XRequestOptions<PaiRunRequest, SSEOutput, PaiChatMessage>['fetch']
> = async (input, options) => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= REQUEST_RECONNECT_TIMES; attempt += 1) {
    try {
      const response = await globalThis.fetch(input, options);
      if (!response.ok) throw await readResponseError(response);
      return response;
    } catch (error) {
      if (
        options.signal?.aborted ||
        (error instanceof Error && error.name !== 'TypeError')
      ) {
        throw error;
      }
      lastError = error;
      if (attempt < REQUEST_RECONNECT_TIMES) {
        await new Promise((resolve) =>
          globalThis.setTimeout(resolve, REQUEST_RECONNECT_DELAY_MS),
        );
      }
    }
  }
  throw new Error('无法连接服务器', { cause: lastError });
};

const parseTextDelta = (data: unknown): string | undefined => {
  try {
    const payload = typeof data === 'string' ? JSON.parse(data) : data;
    return typeof payload === 'object' &&
      payload !== null &&
      'text' in payload &&
      typeof payload.text === 'string'
      ? payload.text
      : undefined;
  } catch {
    return undefined;
  }
};

const parseObject = (data: unknown): Record<string, unknown> | undefined => {
  try {
    const value = typeof data === 'string' ? JSON.parse(data) : data;
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * 前端消息只负责立即显示本轮问题。历史上下文由后端按会话 ID 从 MySQL
 * 查询并裁剪，避免浏览器发送的历史成为模型的可信输入。
 */
class PaiChatProvider extends AbstractChatProvider<
  PaiChatMessage,
  PaiRunRequest,
  SSEOutput
> {
  override transformParams(
    requestParams: Partial<PaiRunRequest>,
    _options: XRequestOptions<PaiRunRequest>,
  ): PaiRunRequest {
    const userMessage = requestParams.messages?.find(
      (message) => message.role === 'user',
    );
    const content = userMessage?.content.trim();
    if (!requestParams.idempotencyKey || !content) {
      throw new Error('pAI Run 缺少幂等键或用户消息');
    }

    // 后端从 MySQL 组装可信历史；出站请求只携带本轮用户输入和能力开关。
    return {
      idempotencyKey: requestParams.idempotencyKey,
      content,
      ...(requestParams.knowledgeEnabled ? { knowledgeEnabled: true } : {}),
      ...(requestParams.webSearchEnabled ? { webSearchEnabled: true } : {}),
    };
  }

  override transformLocalMessage(
    requestParams: Partial<PaiRunRequest>,
  ): PaiChatMessage[] {
    return requestParams.messages ?? [];
  }

  /**
   * pAI 自有事件与模型 Provider 无关；reasoning 仍转换为
   * <think> 标记，保持当前界面的折叠思考展示。
   */
  override transformMessage(
    info: TransformMessage<PaiChatMessage, SSEOutput>,
  ): PaiChatMessage {
    const originContent = info.originMessage?.content ?? '';
    let content = originContent;
    const sources =
      parseMessageSourcesEvent(info.chunk?.event, info.chunk?.data) ??
      info.originMessage?.sources;
    let terminalStatus = info.originMessage?.terminalStatus;
    let errorMessage = info.originMessage?.errorMessage;

    if (info.chunk?.event === 'reasoning-delta') {
      const text = parseTextDelta(info.chunk.data);
      if (text) {
        content = originContent
          ? `${originContent}${text}`
          : `\n\n<think>\n\n${text.replace(/^\n{0,2}/, '')}`;
      }
    } else if (info.chunk?.event === 'text-delta') {
      const text = parseTextDelta(info.chunk.data);
      if (text) {
        if (
          originContent.includes('<think>') &&
          !originContent.includes('</think>')
        ) {
          content = `${originContent
            .replace('<think>', '<think status="done">')
            .replace(/[\s\n]{0,2}$/, '')}\n\n</think>\n\n${text}`;
        } else {
          content = `${originContent}${text}`;
        }
      }
    } else if (info.chunk?.event === 'done') {
      // SSE 仍是 HTTP 200；业务终态必须从 done/error 事件单独记录供气泡判断。
      const status = parseObject(info.chunk.data)?.status;
      if (
        status === 'completed' ||
        status === 'failed' ||
        status === 'aborted'
      ) {
        terminalStatus = status;
      }
    } else if (info.chunk?.event === 'error') {
      const payload = parseObject(info.chunk.data);
      terminalStatus = 'failed';
      if (typeof payload?.errorMessage === 'string') {
        errorMessage = payload.errorMessage;
      }
    }

    return {
      role: 'assistant',
      content,
      ...(sources ? { sources } : {}),
      ...(terminalStatus ? { terminalStatus } : {}),
      ...(errorMessage ? { errorMessage } : {}),
    };
  }
}

/** 最终传输失败时替换同一条占位消息，并保留已经收到的部分正文。 */
export const createPaiRequestFallback = (
  _requestParams: Partial<PaiRunRequest>,
  {
    error,
    messageInfo,
  }: {
    error: Error;
    messageInfo: MessageInfo<PaiChatMessage>;
  },
): PaiChatMessage => {
  const aborted = error.name === 'AbortError';
  return {
    ...(messageInfo?.message ?? { role: 'assistant', content: '' }),
    role: 'assistant',
    terminalStatus: aborted ? 'aborted' : 'failed',
    ...(!aborted ? { errorMessage: error.message } : {}),
  };
};

/** 失败轮次不会进入模型历史；重试时重新发送它前面的用户问题。 */
export const findRetryQuestion = (
  messages: readonly MessageInfo<PaiChatMessage>[],
  failedMessageIndex: number,
) => {
  for (let index = failedMessageIndex - 1; index >= 0; index -= 1) {
    const candidate = messages[index]?.message;
    if (candidate?.role === 'user' && candidate.content.trim()) {
      return candidate.content;
    }
  }
  return undefined;
};

/**
 * 核心请求链路：
 * conversationId 决定唯一 Run URL；Provider 不再从 X SDK Store 读取历史，
 * XRequest 只携带当前用户消息并使用本站登录 token。
 */
export const createPaiChatProvider = (conversationId: string) => {
  const accessToken = getAccessToken();
  return new PaiChatProvider({
    request: XRequest<PaiRunRequest, SSEOutput, PaiChatMessage>(
      getRunEndpoint(conversationId),
      {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
        fetch: fetchPaiRun,
        manual: true,
      },
    ),
  });
};
