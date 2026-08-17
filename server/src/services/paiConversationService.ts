/**
 * pAI 会话应用服务。
 *
 * 核心链路：
 * 1. 路由传入当前用户、会话、本轮消息和功能开关。
 * 2. Repository 在事务中校验会话归属与并发状态，并创建或幂等命中 Run。
 * 3. Service 从 MySQL 读取历史，只把最近已完成轮次组装为模型上下文。
 * 4. 开启知识库时，将本地授权资料作为 system message 注入并登记初始来源。
 * 5. PaiAgentService 把 Mastra 流转换为 reasoning、正文和来源事件；本服务负责透传。
 * 6. 正文生成期间定时保存快照，结束时统一保存正文、来源和 Run 终态。
 * 7. 重复请求不再调用模型，而是把已落库结果重新投影成相同事件流。
 *
 * MySQL 是会话、Run、消息和来源的唯一持久化来源；本文件不启用 Mastra Memory，
 * 以免客户端历史、Mastra Memory 与业务数据库形成多套状态。
 */
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
  CreatePaiConversationInput,
  PaiConversationHistory,
  PaiConversationRepositoryPort,
  PaiConversationScope,
  PaiConversationSummary,
  PaiRunReference,
} from '../repositories/paiConversationRepository.js';

/** 单次模型调用最多携带的已完成历史轮次数，当前问题不计入该上限。 */
const MODEL_HISTORY_TURN_LIMIT = 50;
/** 流式正文快照的最小保存间隔，降低断流时的数据损失并避免逐分片写库。 */
const STREAM_SAVE_INTERVAL_MS = 1_000;

/** 开始一轮 pAI 对话所需的可信服务层输入。 */
export interface StartPaiConversationTurnInput {
  /** 当前认证用户，也是会话所有权校验主体。 */
  ownerUserId: string;
  /** 当前会话 ID。 */
  conversationId: string;
  /** 客户端生成的幂等键；重复提交时复用同一 Run。 */
  idempotencyKey: string;
  /** 本轮用户原始问题，不包含客户端拼装的历史。 */
  content: string;
  /** 是否把本地授权知识资料注入模型上下文。 */
  knowledgeEnabled: boolean;
  /** 是否允许 Agent 在本轮调用联网搜索工具。 */
  webSearchEnabled: boolean;
  /** 贯穿 HTTP、Run 和模型错误日志的追踪 ID。 */
  traceId: string;
  /** 客户端断开连接时用于中止上游模型请求。 */
  abortSignal: AbortSignal;
}

/** 路由写入 SSE 所需的 Run 元数据和领域事件流。 */
export interface PaiTurnStream {
  /** 本轮持久化 Run 的标识、轮次和消息 ID。 */
  run: PaiRunReference;
  /** 是否为幂等重放；true 表示没有再次调用模型。 */
  replayed: boolean;
  /** 统一的 reasoning、正文和来源事件。 */
  events: AsyncGenerator<PaiAgentEvent>;
}

export interface PaiConversationServicePort {
  create(
    input: CreatePaiConversationInput,
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
  /** 会话、Run、消息和来源的唯一持久化入口。 */
  repository: PaiConversationRepositoryPort;
  /** 已屏蔽 Mastra 具体 Chunk 协议的 Agent 流入口。 */
  agentService: Pick<PaiAgentService, 'stream'>;
  /** 本地授权知识资料根目录。 */
  articlesDirectory: string;
  /** 启动配置中是否存在可用模型凭据。 */
  modelConfigured: boolean;
  /** 写入 Run 与诊断日志的模型供应商标识。 */
  modelProvider: string;
  /** 写入 Run 与诊断日志的实际模型名。 */
  modelName: string;
}

/** 创建统一的“会话不存在”领域错误。 */
function conversationNotFound(): AppError {
  return new AppError({
    statusCode: 404,
    errorCode: 'PAI_CONVERSATION_NOT_FOUND',
    errorMessage: '会话不存在',
  });
}

/** 将 Agent 来源转换为 Repository 可持久化的来源结构。 */
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

/** 从有限层级的 Error cause 链中提取上游错误码用于精简日志。 */
function getErrorCode(error: unknown): string | undefined {
  // current 沿 cause 链向上移动；depth 限制日志解析成本并避免异常循环引用。
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
  /** 所有业务状态的数据库边界。 */
  private readonly repository: PaiConversationRepositoryPort;
  /** 模型事件的领域适配器。 */
  private readonly agentService: Pick<PaiAgentService, 'stream'>;
  /** 每次知识问答时读取的资料目录。 */
  private readonly articlesDirectory: string;
  /** 在创建 Run 前快速拒绝未配置模型的请求。 */
  private readonly modelConfigured: boolean;
  /** Run 与日志使用的供应商标识。 */
  private readonly modelProvider: string;
  /** Run 与日志使用的模型标识。 */
  private readonly modelName: string;

  /** 注入持久化、Agent、知识目录和模型标识。 */
  constructor(options: PaiConversationServiceOptions) {
    this.repository = options.repository;
    this.agentService = options.agentService;
    this.articlesDirectory = options.articlesDirectory;
    this.modelConfigured = options.modelConfigured;
    this.modelProvider = options.modelProvider;
    this.modelName = options.modelName;
  }

  /** 创建会话，并把组织访问失败转换为领域错误。 */
  async create(
    input: CreatePaiConversationInput,
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

  /** 按用户和作用域列出会话。 */
  list(
    ownerUserId: string,
    scope: PaiConversationScope,
    limit: number,
  ): Promise<PaiConversationSummary[]> {
    return this.repository.list(ownerUserId, scope, limit);
  }

  /** 读取会话完整历史，不存在时返回统一领域错误。 */
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

  /** 更新会话标题，不存在时返回统一领域错误。 */
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

  /** 删除会话，并将 Repository 的未找到结果转换为领域错误。 */
  async delete(
    ownerUserId: string,
    conversationId: string,
  ): Promise<{ deleted: true }> {
    const result = await this.repository.delete(ownerUserId, conversationId);
    if (result === 'not_found') throw conversationNotFound();
    return { deleted: true };
  }

  /** 创建或回放一轮对话，并协调知识注入、模型流与终态落库。 */
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

    // started 同时表达新建、幂等重放、会话不可用和已有运行中请求。
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

    // 创建 Run 后重新读取历史，确保模型上下文包含数据库中的最新有序轮次。
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

    // messages 是唯一发送给 Agent 的对话历史；客户端不能自行注入旧消息。
    const messages = this.buildModelHistory(history, input.content);
    // initialSources 在模型输出前即可发送，并在终态落库时与联网来源合并。
    const initialSources: PaiSource[] = [];
    if (input.knowledgeEnabled) {
      try {
        // materials 是通过目录约束和 Schema 校验后的全部本地授权资料。
        const materials = await loadAllLocalKnowledgeMaterials(
          this.articlesDirectory,
        );
        // knowledgeContext 同时提供 system message 和与其对应的可追溯来源。
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

    // agentEvents 仅暴露 pAI 领域事件，不泄漏 Mastra 的底层 Chunk 类型。
    let agentEvents: Awaited<ReturnType<PaiAgentService['stream']>>;
    try {
      agentEvents = await this.agentService.stream(messages, {
        abortSignal: input.abortSignal,
        webSearchEnabled: input.webSearchEnabled,
      });
    } catch (error) {
      // aborted 区分用户主动断开与模型建连失败，两者写入不同 Run 终态。
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

  /** 从已完成轮次构建受轮数限制的模型历史，并追加当前问题。 */
  private buildModelHistory(
    history: PaiConversationHistory,
    currentContent: string,
  ): PaiAgentMessage[] {
    // 失败和中止轮次保留在数据库中供用户查看，但不进入下一次模型上下文。
    // completedTurns 排除失败/中止轮次，避免把不完整回答带入下一次模型调用。
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

  /** 将已落库的终态回答和来源重新投影为 Agent 事件。 */
  private async *replayTurn(
    history: PaiConversationHistory,
    runId: string,
  ): AsyncGenerator<PaiAgentEvent> {
    // assistant 是目标 Run 已落库的最终回答；不存在时没有可重放事件。
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

  /** 转发实时 Agent 事件，增量保存正文，并在结束或异常时完成 Run。 */
  private async *streamLiveTurn(
    runId: string,
    agentEvents: AsyncGenerator<PaiAgentEvent>,
    initialSources: readonly PaiSource[],
    traceId: string,
    abortSignal: AbortSignal,
  ): AsyncGenerator<PaiAgentEvent> {
    // answer 是可恢复的助手正文；reasoning 只透传，不进入该变量和数据库。
    let answer = '';
    // lastSavedAt 控制正文快照频率，最终完整正文仍由 completeRun 保存。
    let lastSavedAt = Date.now();
    // outputStarted 只用于判断失败发生在模型输出前还是输出过程中。
    let outputStarted = initialSources.length > 0;
    // sourcesById 合并知识库与联网来源，并用 sourceId 去重、保留最新值。
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
          // now 与 lastSavedAt 比较，达到间隔后才写入一次可恢复正文快照。
          const now = Date.now();
          if (now - lastSavedAt >= STREAM_SAVE_INTERVAL_MS) {
            await this.repository.saveAssistantContent(runId, answer);
            lastSavedAt = now;
          }
        }
        yield event;
      }
    } catch (error) {
      // 流中异常仍保存已生成正文和来源；仅客户端中止使用 aborted 终态。
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

  /** 记录不含敏感请求内容的模型失败诊断信息。 */
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

  /** 创建“当前会话已有运行中请求”错误。 */
  private runInProgress(): AppError {
    return new AppError({
      statusCode: 409,
      errorCode: 'PAI_RUN_IN_PROGRESS',
      errorMessage: '该会话正在生成回答',
    });
  }

  /** 创建客户端主动中止请求错误。 */
  private clientAborted(): AppError {
    return new AppError({
      statusCode: 499,
      errorCode: 'CLIENT_ABORTED',
      errorMessage: '客户端已中止请求',
    });
  }
}
