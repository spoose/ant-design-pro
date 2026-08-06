import { type Response, Router } from 'express';
import { AppError } from '../errors/appError.js';
import { sendSuccess } from '../http/response.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../middleware/validate.js';
import type { PaiConversationScope } from '../repositories/paiConversationRepository.js';
import type {
  CreatePaiConversationRequest,
  ListPaiConversationsQuery,
  PaiConversationParams,
  StartPaiRunRequest,
  UpdatePaiConversationRequest,
} from '../schemas/pai.js';
import {
  createPaiConversationSchema,
  listPaiConversationsQuerySchema,
  paiConversationParamsSchema,
  startPaiRunSchema,
  updatePaiConversationSchema,
} from '../schemas/pai.js';
import type { PaiConversationServicePort } from '../services/paiConversationService.js';

function toScope(
  input: CreatePaiConversationRequest | ListPaiConversationsQuery,
): PaiConversationScope {
  return input.scopeType === 'platform'
    ? { type: 'platform' }
    : { type: 'organization', organizationId: input.organizationId };
}

function writeSse(response: Response, event: string, data: unknown): void {
  response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function createPaiConversationsRouter(
  conversations: PaiConversationServicePort,
): Router {
  const router = Router();

  router.post(
    '/',
    validateBody(createPaiConversationSchema),
    async (_request, response, next) => {
      try {
        const body = response.locals
          .validatedBody as CreatePaiConversationRequest;
        sendSuccess(
          response,
          await conversations.create({
            ownerUserId: response.locals.authenticatedUserId,
            scope: toScope(body),
            title: body.title,
          }),
          201,
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/',
    validateQuery(listPaiConversationsQuerySchema),
    async (_request, response, next) => {
      try {
        const query = response.locals
          .validatedQuery as ListPaiConversationsQuery;
        sendSuccess(
          response,
          await conversations.list(
            response.locals.authenticatedUserId,
            toScope(query),
            query.limit,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/:conversationId',
    validateParams(paiConversationParamsSchema),
    validateBody(updatePaiConversationSchema),
    async (_request, response, next) => {
      try {
        const { conversationId } = response.locals
          .validatedParams as PaiConversationParams;
        const { title } = response.locals
          .validatedBody as UpdatePaiConversationRequest;
        sendSuccess(
          response,
          await conversations.updateTitle(
            response.locals.authenticatedUserId,
            conversationId,
            title,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/:conversationId',
    validateParams(paiConversationParamsSchema),
    async (_request, response, next) => {
      try {
        const { conversationId } = response.locals
          .validatedParams as PaiConversationParams;
        sendSuccess(
          response,
          await conversations.getHistory(
            response.locals.authenticatedUserId,
            conversationId,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/:conversationId',
    validateParams(paiConversationParamsSchema),
    async (_request, response, next) => {
      try {
        const { conversationId } = response.locals
          .validatedParams as PaiConversationParams;
        sendSuccess(
          response,
          await conversations.delete(
            response.locals.authenticatedUserId,
            conversationId,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/:conversationId/runs',
    validateParams(paiConversationParamsSchema),
    validateBody(startPaiRunSchema),
    async (_request, response, next) => {
      const upstreamAbortController = new AbortController();
      const abortUpstream = () => {
        if (!response.writableEnded) upstreamAbortController.abort();
      };
      response.once('close', abortUpstream);

      try {
        const { conversationId } = response.locals
          .validatedParams as PaiConversationParams;
        const body = response.locals.validatedBody as StartPaiRunRequest;
        const stream = await conversations.startTurn({
          ownerUserId: response.locals.authenticatedUserId,
          conversationId,
          idempotencyKey: body.idempotencyKey,
          content: body.content,
          knowledgeEnabled: body.knowledgeEnabled,
          webSearchEnabled: body.webSearchEnabled,
          traceId: response.locals.traceId,
          abortSignal: upstreamAbortController.signal,
        });

        response.status(200);
        response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        response.setHeader('Cache-Control', 'no-cache, no-transform');
        response.setHeader('X-Accel-Buffering', 'no');
        response.flushHeaders();

        writeSse(response, 'run', {
          conversationId,
          ...stream.run,
          replayed: stream.replayed,
        });
        for await (const event of stream.events) {
          writeSse(
            response,
            event.type,
            event.type === 'sources'
              ? { sources: event.sources }
              : { text: event.text },
          );
        }

        if (!response.destroyed && !response.writableEnded) {
          writeSse(response, 'done', {
            runId: stream.run.runId,
            status: stream.replayed ? stream.run.status : 'completed',
          });
          response.end();
        }
      } catch (error) {
        if (response.headersSent) {
          if (!response.destroyed && !response.writableEnded) {
            const appError =
              error instanceof AppError
                ? error
                : new AppError({
                    statusCode: 500,
                    errorCode: 'INTERNAL_ERROR',
                    errorMessage: '服务器内部错误',
                    cause: error,
                  });
            writeSse(response, 'error', {
              errorCode: appError.errorCode,
              errorMessage: appError.message,
            });
            response.end();
          }
          return;
        }
        next(error);
      } finally {
        response.off('close', abortUpstream);
      }
    },
  );

  return router;
}
