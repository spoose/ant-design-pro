/**
 * pAI 与 Ant Design X SDK 的协议适配层：
 * 出站时清理空消息和 UI 字段并附带登录凭证；入站时
 * 将本站 reasoning/text/sources SSE 事件合并进同一条 assistant 消息。
 */
import {
  AbstractChatProvider,
  type SSEOutput,
  type TransformMessage,
  type XModelMessage,
  type XModelParams,
  XRequest,
  type XRequestOptions,
} from '@ant-design/x-sdk';
import { getAccessToken } from '@/utils/authToken';
import { parseMessageSourcesEvent } from './sourceProtocol';
import type { PaiChatMessage } from './types';

const PAI_CHAT_ENDPOINT = '/api/pai/chat/completions';

const hasSendableContent = ({ content }: XModelMessage) =>
  (typeof content === 'string' ? content : content.text).trim().length > 0;

const toModelRequestMessage = ({ role, content }: XModelMessage) => ({
  role,
  content: typeof content === 'string' ? content : content.text,
});

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

/**
 * useXChat 会保留失败请求的空 assistant 占位气泡，方便界面显示错误状态；
 * 但该空消息不属于有效对话上下文，下一轮请求前必须排除。sources 等
 * 前端展示字段也必须在出站时移除，后端模型协议只接收 role/content。
 */
class PaiChatProvider extends AbstractChatProvider<
  PaiChatMessage,
  XModelParams,
  SSEOutput
> {
  override transformParams(
    requestParams: Partial<XModelParams>,
    options: XRequestOptions<XModelParams>,
  ): XModelParams {
    const params = {
      ...(options.params ?? {}),
      ...requestParams,
      messages: this.getMessages(),
    } as XModelParams;
    return {
      ...params,
      messages: params.messages
        ?.filter(hasSendableContent)
        .map(toModelRequestMessage),
    };
  }

  override transformLocalMessage(
    requestParams: Partial<XModelParams>,
  ): PaiChatMessage[] {
    return (requestParams.messages ?? []) as PaiChatMessage[];
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
    }

    return {
      role: 'assistant',
      content,
      ...(sources ? { sources } : {}),
    };
  }
}

/**
 * 核心请求链路：
 * useXChat 将当前会话交给 PaiChatProvider 组装 messages，
 * XRequest 携带本站登录 token 请求后端 Agent。
 */
export const createPaiChatProvider = () => {
  const accessToken = getAccessToken();
  return new PaiChatProvider({
    request: XRequest<XModelParams, SSEOutput, PaiChatMessage>(
      PAI_CHAT_ENDPOINT,
      {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
        manual: true,
      },
    ),
  });
};
