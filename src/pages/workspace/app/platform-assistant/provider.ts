/**
 * pAI 与 Ant Design X SDK 的协议适配层：
 * 出站时清理空消息和 UI 字段并附带登录凭证；入站时复用 DeepSeek 流解析，
 * 再把本站 sources SSE 事件合并进同一条 assistant 消息。
 */
import {
  DeepSeekChatProvider,
  type XModelMessage,
  type XModelParams,
  XRequest,
  type XRequestOptions,
} from '@ant-design/x-sdk';
import { getAccessToken } from '@/utils/authToken';
import { parseMessageSourcesEvent } from './sourceProtocol';
import type { PaiChatMessage } from './types';

const PAI_CHAT_ENDPOINT = '/api/pai/chat/completions';

type PaiTransformMessageInfo = Parameters<
  DeepSeekChatProvider<PaiChatMessage, XModelParams>['transformMessage']
>[0];

const hasSendableContent = ({ content }: XModelMessage) =>
  (typeof content === 'string' ? content : content.text).trim().length > 0;

const toModelRequestMessage = ({ role, content }: XModelMessage) => ({
  role,
  content: typeof content === 'string' ? content : content.text,
});

/**
 * useXChat 会保留失败请求的空 assistant 占位气泡，方便界面显示错误状态；
 * 但该空消息不属于有效对话上下文，下一轮请求前必须排除。sources 等
 * 前端展示字段也必须在出站时移除，后端模型协议只接收 role/content。
 */
class PaiDeepSeekChatProvider extends DeepSeekChatProvider<
  PaiChatMessage,
  XModelParams
> {
  override transformParams(
    requestParams: Partial<XModelParams>,
    options: XRequestOptions<XModelParams>,
  ): XModelParams {
    const params = super.transformParams(requestParams, options);
    return {
      ...params,
      messages: params.messages
        ?.filter(hasSendableContent)
        .map(toModelRequestMessage),
    };
  }

  /**
   * sources 是本站在 DeepSeek 数据流前发送的结构化 SSE 事件。
   * 后续 reasoning/content 分块通过 originMessage 延续该字段，保证来源不会被覆盖。
   */
  override transformMessage(info: PaiTransformMessageInfo): PaiChatMessage {
    const message = super.transformMessage(info);
    const sources =
      // X SDK 在 onSuccess 阶段会以 chunk=undefined 再转换一次消息，
      // 此时只负责把状态收口为 success，并沿用流式阶段已保存的 sources。
      parseMessageSourcesEvent(info.chunk?.event, info.chunk?.data) ??
      info.originMessage?.sources;

    return {
      ...message,
      ...(sources ? { sources } : {}),
    };
  }
}

/**
 * 核心请求链路：
 * useXChat 将当前会话交给 DeepSeekChatProvider 组装 messages，
 * XRequest 携带本站登录 token 请求后端，模型 Key 和模型参数只由后端持有。
 */
export const createPaiChatProvider = () => {
  const accessToken = getAccessToken();
  return new PaiDeepSeekChatProvider({
    request: XRequest<XModelParams>(PAI_CHAT_ENDPOINT, {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
      manual: true,
    }),
  });
};
