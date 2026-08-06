import { createPaiKnowledgeContext } from '../ai/knowledge/createPaiKnowledgeContext.js';
import { loadAllLocalKnowledgeMaterials } from '../ai/knowledge/loadLocalKnowledgeMaterials.js';
import type {
  PaiAgentEvent,
  PaiAgentMessage,
  PaiAgentService,
  PaiSource,
} from '../ai/services/paiAgentService.js';
import { AppError } from '../errors/appError.js';
import type {
  CompletePaiRunSourceInput,
  PaiConversationHistory,
  PaiConversationRepositoryPort,
  PaiConversationScope,
  PaiConversationSummary,
  PaiRunReference,
} from '../repositories/paiConversationRepository.js';

const MODEL_HISTORY_TURN_LIMIT = 50;
const STREAM_SAVE_INTERVAL_MS = 1_000;

export interface CreatePaiConversationServiceInput {
  ownerUserId: string;
  scope: PaiConversationScope;
  title: string;
}

export interface StartPaiConversationTurnInput {
  ownerUserId: string;
  conversationId: string;
  idempotencyKey: string;
  content: string;
  knowledgeEnabled: boolean;
  webSearchEnabled: boolean;
  traceId: string;
  abortSignal: AbortSignal;
}

export interface PaiTurnStream {
  run: PaiRunReference;
  replayed: boolean;
  events: AsyncGenerator<PaiAgentEvent>;
}

export interface PaiConversationServicePort {
  create(
    input: CreatePaiConversationServiceInput,
  ): Promise<PaiConversationSummary>;
  list(
    ownerUserId: string,
    scope: PaiConversationScope,
    limit: number,
  ): Promise<PaiConversationSummary[]>;
  updateTitle(
    ownerUserId: string,
    conversationId: string,
    title: string,
  ): Promise<PaiConversationSummary>;
  getHistory(
    ownerUserId: string,
    conversationId: string,
  ): Promise<PaiConversationHistory>;
  delete(ownerUserId: string, conversationId: string): Promise<{ deleted: true }>;
  startTurn(input: StartPaiConversationTurnInput): Promise<PaiTurnStream>;
}

export interface PaiConversationServiceOptions {
  repository: PaiConversationRepositoryPort;
  agentService: Pick<PaiAgentService, 'stream'>;
  articlesDirectory: string;
  modelConfigured: boolean;
  modelProvider: string;
  modelName: string;
}

function conversationNotFound(): AppError {
  return new AppError({
    statusCode: 404,
    errorCode: 'PAI_CONVERSATION_NOT_FOUND',
    errorMessage: '会话不存在',
  });
}

function toStoredSource(source: PaiSource): CompletePaiRunSourceInput {
  return {
    sourceId: source.sourceId,
    sourceType: source.sourceType,
    title: source.title,
    sourceUrl: source.sourceUrl ?? null,
    snippet: source.snippet ?? null,
    publishedAt: source.publishedAt ? new Date(source.publishedAt) : null,
    sourceUpdatedAt: source.updatedAt ? new Date(source.updatedAt) : null,
  };
}

function getErrorCode(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; depth < 3 && current instanceof Error; depth += 1) {
    if ('code' in current && typeof current.code === 'string') {
      return current.code;
    }
    current = current.cause;
  }
  return undefined;
}

export class PaiConversationService implements PaiConversationServicePort {
  private readonly repository: PaiConversationRepositoryPort;
  private readonly agentService: Pick<PaiAgentService, 'stream'>;
  private readonly articlesDirectory: string;
  private readonly modelConfigured: boolean;
  private readonly modelProvider: string;
  private readonly modelName: string;

  constructor(options: PaiConversationServiceOptions) {
    this.repository = options.repository;
    this.agentService = options.agentService;
    this.articlesDirectory = options.articlesDirectory;
    this.modelConfigured = options.modelConfigured;
    this.modelProvider = options.modelProvider;
    this.modelName = options.modelName;
  }

  async create(
    input: CreatePaiConversationServiceInput,
  ): Promise<PaiConversationSummary> {
    const conversation = await this.repository.create(input);
    if (!conversation) {
      throw new AppError({
        statusCode: 403,
        errorCode: 'ORGANIZATION_FORBIDDEN',
        errorMessage: '无权访问该组织',
      });
    }
    return conversation;
  }

  list(
    ownerUserId: string,
    scope: PaiConversationScope,
    limit: number,
  ): Promise<PaiConversationSummary[]> {
    return this.repository.list(ownerUserId, scope, limit);
  }

  async getHistory(
    ownerUserId: string,
    conversationId: string,
  ): Promise<PaiConversationHistory> {
    const history = await this.repository.getHistory(
      ownerUserId,
      conversationId,
    );
    if (!history) throw conversationNotFound();
    return history;
  }

  async updateTitle(
    ownerUserId: string,
    conversationId: string,
    title: string,
  ): Promise<PaiConversationSummary> {
    const conversation = await this.repository.updateTitle(
      ownerUserId,
      conversationId,
      title,
    );
    if (!conversation) throw conversationNotFound();
    return conversation;
  }

  async delete(
    ownerUserId: string,
    conversationId: string,
  ): Promise<{ deleted: true }> {
    const result = await this.repository.delete(ownerUserId, conversationId);
    if (result === 'not_found') throw conversationNotFound();
    return { deleted: true };
  }

  async startTurn(
    input: StartPaiConversationTurnInput,
  ): Promise<PaiTurnStream> {
    if (!this.modelConfigured) {
      throw new AppError({
        statusCode: 503,
        errorCode: 'AI_MODEL_NOT_CONFIGURED',
        errorMessage: '模型服务尚未配置',
      });
    }

    const started = await this.repository.startRun({
      ownerUserId: input.ownerUserId,
      conversationId: input.conversationId,
      idempotencyKey: input.idempotencyKey,
      content: input.content,
      knowledgeEnabled: input.knowledgeEnabled,
      webSearchEnabled: input.webSearchEnabled,
      modelProvider: this.modelProvider,
      modelName: this.modelName,
      traceId: input.traceId,
    });

    if (started.kind === 'conversation_unavailable') {
      throw conversationNotFound();
    }
    if (started.kind === 'run_in_progress') {
      throw this.runInProgress();
    }

    const history = await this.repository.getHistory(
      input.ownerUserId,
      input.conversationId,
    );
    if (!history) {
      if (started.kind === 'started') {
        await this.repository.completeRun({
          runId: started.run.runId,
          status: 'aborted',
          content: '',
          errorCode: 'CONVERSATION_UNAVAILABLE',
        });
      }
      throw conversationNotFound();
    }

    if (started.kind === 'replayed') {
      if (
        started.run.status === 'pending' ||
        started.run.status === 'streaming'
      ) {
        throw this.runInProgress();
      }
      return {
        run: started.run,
        replayed: true,
        events: this.replayTurn(history, started.run.runId),
      };
    }

    const messages = this.buildModelHistory(history, input.content);
    const initialSources: PaiSource[] = [];
    if (input.knowledgeEnabled) {
      try {
        const materials = await loadAllLocalKnowledgeMaterials(
          this.articlesDirectory,
        );
        const knowledgeContext = createPaiKnowledgeContext(materials);
        messages.unshift(knowledgeContext.systemMessage);
        initialSources.push(...knowledgeContext.sources);
      } catch (error) {
        await this.repository.completeRun({
          runId: started.run.runId,
          status: 'failed',
          content: '',
          errorCode: 'KNOWLEDGE_BASE_UNAVAILABLE',
        });
        throw new AppError({
          statusCode: 503,
          errorCode: 'KNOWLEDGE_BASE_UNAVAILABLE',
          errorMessage: '知识库暂时不可用',
          cause: error,
        });
      }
    }

    let agentEvents: Awaited<ReturnType<PaiAgentService['stream']>>;
    try {
      agentEvents = await this.agentService.stream(messages, {
        abortSignal: input.abortSignal,
        webSearchEnabled: input.webSearchEnabled,
      });
    } catch (error) {
      const aborted = input.abortSignal.aborted;
      await this.repository.completeRun({
        runId: started.run.runId,
        status: aborted ? 'aborted' : 'failed',
        content: '',
        errorCode: aborted ? 'CLIENT_ABORTED' : 'AI_MODEL_UNAVAILABLE',
      });
      if (aborted) throw this.clientAborted();
      this.logModelFailure(input.traceId, started.run.runId, error, false);
      throw new AppError({
        statusCode: 502,
        errorCode: 'AI_MODEL_UNAVAILABLE',
        errorMessage: '模型服务暂时不可用',
        cause: error,
      });
    }

    return {
      run: started.run,
      replayed: false,
      events: this.streamLiveTurn(
        started.run.runId,
        agentEvents,
        initialSources,
        input.traceId,
        input.abortSignal,
      ),
    };
  }

  private buildModelHistory(
    history: PaiConversationHistory,
    currentContent: string,
  ): PaiAgentMessage[] {
    // 失败和中止轮次保留在数据库中供用户查看，但不进入下一次模型上下文。
    const completedTurns = history.turns
      .filter((turn) => turn.status === 'completed')
      .slice(-MODEL_HISTORY_TURN_LIMIT);
    return [
      ...completedTurns.flatMap((turn) =>
        turn.messages.map(({ role, content }) => ({ role, content })),
      ),
      { role: 'user', content: currentContent },
    ];
  }

  private async *replayTurn(
    history: PaiConversationHistory,
    runId: string,
  ): AsyncGenerator<PaiAgentEvent> {
    const assistant = history.turns
      .find((turn) => turn.runId === runId)
      ?.messages.find((message) => message.role === 'assistant');
    if (!assistant) return;

    if (assistant.sources.length > 0) {
      yield {
        type: 'sources',
        sources: assistant.sources.map((source) => ({
          sourceId: source.sourceId,
          sourceType: source.sourceType,
          title: source.title,
          ...(source.sourceUrl ? { sourceUrl: source.sourceUrl } : {}),
          ...(source.snippet ? { snippet: source.snippet } : {}),
          ...(source.publishedAt
            ? { publishedAt: source.publishedAt.toISOString() }
            : {}),
          ...(source.sourceUpdatedAt
            ? { updatedAt: source.sourceUpdatedAt.toISOString() }
            : {}),
        })),
      };
    }
    if (assistant.content) {
      yield { type: 'text-delta', text: assistant.content };
    }
  }

  private async *streamLiveTurn(
    runId: string,
    agentEvents: AsyncGenerator<PaiAgentEvent>,
    initialSources: readonly PaiSource[],
    traceId: string,
    abortSignal: AbortSignal,
  ): AsyncGenerator<PaiAgentEvent> {
    // answer 是可恢复的助手正文；reasoning 只透传，不进入该变量和数据库。
    let answer = '';
    let lastSavedAt = Date.now();
    let outputStarted = initialSources.length > 0;
    const sourcesById = new Map(
      initialSources.map((source) => [source.sourceId, source]),
    );

    try {
      if (sourcesById.size > 0) {
        yield { type: 'sources', sources: [...sourcesById.values()] };
      }

      for await (const event of agentEvents) {
        outputStarted = true;
        if (event.type === 'sources') {
          for (const source of event.sources) {
            sourcesById.set(source.sourceId, source);
          }
          yield { type: 'sources', sources: [...sourcesById.values()] };
          continue;
        }

        if (event.type === 'text-delta') {
          answer += event.text;
          const now = Date.now();
          if (now - lastSavedAt >= STREAM_SAVE_INTERVAL_MS) {
            await this.repository.saveAssistantContent(runId, answer);
            lastSavedAt = now;
          }
        }
        yield event;
      }
    } catch (error) {
      const aborted = abortSignal.aborted;
      await this.repository.completeRun({
        runId,
        status: aborted ? 'aborted' : 'failed',
        content: answer,
        errorCode: aborted ? 'CLIENT_ABORTED' : 'AI_MODEL_UNAVAILABLE',
        sources: [...sourcesById.values()].map(toStoredSource),
      });
      if (aborted) throw this.clientAborted();
      this.logModelFailure(traceId, runId, error, outputStarted);
      throw new AppError({
        statusCode: 502,
        errorCode: 'AI_MODEL_UNAVAILABLE',
        errorMessage: '模型服务暂时不可用',
        cause: error,
      });
    }

    await this.repository.completeRun({
      runId,
      status: 'completed',
      content: answer,
      sources: [...sourcesById.values()].map(toStoredSource),
    });
  }

  private logModelFailure(
    traceId: string,
    runId: string,
    error: unknown,
    outputStarted: boolean,
  ): void {
    console.error('pAI model request failed', {
      traceId,
      runId,
      provider: this.modelProvider,
      model: this.modelName,
      code: getErrorCode(error),
      outputStarted,
    });
  }

  private runInProgress(): AppError {
    return new AppError({
      statusCode: 409,
      errorCode: 'PAI_RUN_IN_PROGRESS',
      errorMessage: '该会话正在生成回答',
    });
  }

  private clientAborted(): AppError {
    return new AppError({
      statusCode: 499,
      errorCode: 'CLIENT_ABORTED',
      errorMessage: '客户端已中止请求',
    });
  }
}
