import type { KnowledgeSource } from '../knowledge/knowledgeMaterial.js';
import { webSearchResponseSchema } from './webSearchService.js';

export type PaiSource = KnowledgeSource & {
  sourceType: 'knowledge' | 'web';
  snippet?: string;
};

export type PaiAgentMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type PaiAgentEvent =
  | { type: 'reasoning-delta'; text: string }
  | { type: 'text-delta'; text: string }
  | { type: 'sources'; sources: PaiSource[] };

export interface PaiAgentRunner {
  stream(
    messages: PaiAgentMessage[],
    options: {
      abortSignal?: AbortSignal;
      activeTools?: 'webSearchTool'[];
    },
  ): Promise<{ fullStream: ReadableStream<unknown> }>;
}

type UnknownChunk = {
  type?: unknown;
  payload?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function createRuntimeContextMessage(
  webSearchEnabled: boolean,
): PaiAgentMessage {
  const currentDate = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Shanghai',
  });
  return {
    role: 'system',
    content: webSearchEnabled
      ? `当前日期：${currentDate}。联网检索已开启，可以按规则使用 webSearchTool。`
      : `当前日期：${currentDate}。联网检索未开启，不得使用 webSearchTool；回答时提示用户“我的知识和信息可能不是最新”。`,
  };
}

/**
 * 把 Mastra Agent 的模型与 Tool 事件投影为 pAI 领域事件。
 * 路由与前端都不需要依赖 Mastra 的具体 Chunk 类型。
 */
export class PaiAgentService {
  constructor(private readonly agent: PaiAgentRunner) {}

  async stream(
    messages: PaiAgentMessage[],
    {
      abortSignal,
      webSearchEnabled,
    }: {
      abortSignal?: AbortSignal;
      webSearchEnabled: boolean;
    },
  ): Promise<AsyncGenerator<PaiAgentEvent>> {
    const run = await this.agent.stream(
      [createRuntimeContextMessage(webSearchEnabled), ...messages],
      {
        ...(abortSignal ? { abortSignal } : {}),
        activeTools: webSearchEnabled ? ['webSearchTool'] : [],
      },
    );

    return this.toPaiEvents(run.fullStream, webSearchEnabled);
  }

  private async *toPaiEvents(
    stream: ReadableStream<unknown>,
    webSearchEnabled: boolean,
  ): AsyncGenerator<PaiAgentEvent> {
    const webSourcesByUrl = new Map<string, Omit<PaiSource, 'sourceId'>>();
    const reader = stream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return;

        const chunk = value as UnknownChunk;
        if (!isRecord(chunk.payload)) continue;

        // Mastra 会把建连、鉴权等上游失败包装成 error chunk；必须继续抛给
        // 会话服务，不能把没有正文的错误流误判为 completed。
        if (chunk.type === 'error') {
          const upstreamError = chunk.payload.error;
          throw upstreamError instanceof Error
            ? upstreamError
            : new Error('Mastra Agent returned an invalid error chunk');
        }

        if (
          (chunk.type === 'reasoning-delta' || chunk.type === 'text-delta') &&
          typeof chunk.payload.text === 'string'
        ) {
          yield { type: chunk.type, text: chunk.payload.text };
          continue;
        }

        if (
          webSearchEnabled &&
          chunk.type === 'tool-result' &&
          chunk.payload.toolName === 'webSearchTool'
        ) {
          const parsedResult = webSearchResponseSchema.safeParse(
            chunk.payload.result,
          );
          if (!parsedResult.success) continue;

          for (const result of parsedResult.data.results) {
            webSourcesByUrl.set(result.url, {
              sourceType: 'web',
              title: result.title,
              sourceUrl: result.url,
              ...(result.description ? { snippet: result.description } : {}),
            });
          }

          if (webSourcesByUrl.size > 0) {
            yield {
              type: 'sources',
              sources: [...webSourcesByUrl.values()].map((source, index) => ({
                sourceId: `web-${index + 1}`,
                ...source,
              })),
            };
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
