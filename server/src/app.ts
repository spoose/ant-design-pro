import { resolve } from 'node:path';
import type { MessageListInput } from '@mastra/core/agent/message-list';
import cors from 'cors';
import type { Express } from 'express';
import express from 'express';
import type { Pool } from 'mysql2/promise';
import { createPaiAgent } from './ai/agents/paiAgent.js';
import { PaiAgentService } from './ai/services/paiAgentService.js';
import type {
  DeepSeekEnv,
  FirecrawlEnv,
  JwtEnv,
  NodeEnvironment,
} from './config/env.js';
import { AppError } from './errors/appError.js';
import { createAuthenticationMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createSuperAdminMiddleware } from './middleware/superAdmin.js';
import { traceId } from './middleware/traceId.js';
import { AdminUserRepository } from './repositories/adminUserRepository.js';
import { OrganizationRepository } from './repositories/organizationRepository.js';
import { PaiConversationRepository } from './repositories/paiConversationRepository.js';
import { PasswordResetRepository } from './repositories/passwordResetRepository.js';
import { UserRepository } from './repositories/userRepository.js';
import { createAdminOrganizationsRouter } from './routes/adminOrganizations.js';
import { createAdminUsersRouter } from './routes/adminUsers.js';
import { createAuthRouter } from './routes/auth.js';
import { createCurrentUserRouter } from './routes/currentUser.js';
import { createHealthRouter } from './routes/health.js';
import { createLogoutRouter } from './routes/logout.js';
import { createPaiConversationsRouter } from './routes/paiConversations.js';
import { createPasswordResetRouter } from './routes/passwordReset.js';
import { createUserPreferencesRouter } from './routes/userPreferences.js';
import { AccessTokenService } from './services/accessTokenService.js';
import { AdminUserService } from './services/adminUserService.js';
import { AuthService } from './services/authService.js';
import { CurrentUserService } from './services/currentUserService.js';
import { OrganizationService } from './services/organizationService.js';
import { PaiConversationService } from './services/paiConversationService.js';
import { PasswordResetService } from './services/passwordResetService.js';
import { PasswordService } from './services/passwordService.js';

export interface CreateAppOptions {
  pool: Pool;
  nodeEnv: NodeEnvironment;
  corsOrigins: string[];
  jwt: JwtEnv;
  deepseek: DeepSeekEnv;
  firecrawl: FirecrawlEnv;
}

export function createApp(options: CreateAppOptions): Express {
  const app = express();
  const users = new UserRepository(options.pool);
  const adminUsers = new AdminUserRepository(options.pool);
  const organizations = new OrganizationRepository(options.pool);
  const paiConversations = new PaiConversationRepository(options.pool);
  const passwordResets = new PasswordResetRepository(options.pool);
  const passwords = new PasswordService();
  const tokens = new AccessTokenService(options.jwt);
  const authService = new AuthService(users, passwords, tokens);
  const adminUserService = new AdminUserService(adminUsers);
  const passwordResetService = new PasswordResetService(
    passwordResets,
    passwords,
    options.nodeEnv === 'development'
      ? 'development-response'
      : 'delivery-unavailable',
  );
  const currentUserService = new CurrentUserService(users);
  const organizationService = new OrganizationService(organizations);
  const paiAgent = createPaiAgent(options.deepseek.model, options.firecrawl);
  const paiAgentService = new PaiAgentService({
    stream: (messages, streamOptions) =>
      paiAgent.stream(messages as MessageListInput, streamOptions),
  });
  const articlesDirectory = resolve('.data/ai/articles');
  const paiConversationService = new PaiConversationService({
    repository: paiConversations,
    agentService: paiAgentService,
    articlesDirectory,
    modelConfigured: Boolean(options.deepseek.apiKey),
    modelProvider: 'deepseek',
    modelName: options.deepseek.model,
  });
  const authenticate = createAuthenticationMiddleware(tokens, users);
  const requireSuperAdmin = createSuperAdminMiddleware(users);

  app.disable('x-powered-by');
  app.use(traceId);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || options.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(
          new AppError({
            statusCode: 403,
            errorCode: 'CORS_ORIGIN_DENIED',
            errorMessage: '请求来源不被允许',
          }),
        );
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/health', createHealthRouter(options.pool));
  app.use('/api', createAuthRouter(authService));
  app.use('/api/login/outLogin', createLogoutRouter(authenticate));
  app.use('/api/password', createPasswordResetRouter(passwordResetService));
  app.use(
    '/api/currentUser',
    createCurrentUserRouter(authenticate, currentUserService),
  );
  // 用户偏好接口始终从 JWT 获取 userId，不接受客户端指定目标用户。
  app.use(
    '/api/users',
    createUserPreferencesRouter(authenticate, currentUserService),
  );
  app.use(
    '/api/pai/conversations',
    authenticate,
    createPaiConversationsRouter(paiConversationService),
  );
  app.use('/api/admin', authenticate, requireSuperAdmin);
  app.use('/api/admin/users', createAdminUsersRouter(adminUserService));
  app.use(
    '/api/admin/organizations',
    createAdminOrganizationsRouter(organizationService),
  );

  app.use((_request, _response, next) => {
    next(
      new AppError({
        statusCode: 404,
        errorCode: 'ROUTE_NOT_FOUND',
        errorMessage: '接口不存在',
      }),
    );
  });
  app.use(errorHandler);

  return app;
}
