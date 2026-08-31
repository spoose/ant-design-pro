import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { traceId } from '../src/middleware/traceId.js';
import type { KnowledgeDocumentRepository } from '../src/repositories/knowledgeDocumentRepository.js';
import { createKnowledgeDocumentsRouter } from '../src/routes/knowledgeDocuments.js';
import type { CurrentUserServicePort } from '../src/services/currentUserService.js';

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const organizationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const createCurrentUser = (permissions: string[] = []) => ({
  userId,
  username: 'user',
  name: '用户',
  avatar: null,
  email: 'user@example.test',
  status: 'active' as const,
  isSuperAdmin: false,
  platformPermissions: [],
  projectAppCodes: [],
  defaultOrganizationId: organizationId,
  organizations: [
    {
      organizationId,
      organizationCode: 'ORG',
      organizationName: '组织',
      permissions,
      appCodes: [],
      dataScopes: [] as [],
      defaultDataScopeId: null,
    },
  ],
});

const createDocument = vi.fn().mockResolvedValue({
  sourceId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  documentId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  fileName: '资料.txt',
  scopeType: 'personal',
  organizationId: null,
  characterCount: 2,
  createdAt: new Date('2026-08-17T00:00:00.000Z'),
});

function createTestApp(permissions: string[] = []) {
  const app = express();
  app.use(traceId);
  app.use(express.json({ limit: '1mb' }));
  app.use((_request, response, next) => {
    response.locals.authenticatedUserId = userId;
    next();
  });
  app.use(
    '/api/knowledge/documents',
    createKnowledgeDocumentsRouter(
      { create: createDocument } as Pick<KnowledgeDocumentRepository, 'create'>,
      {
        getCurrentUser: vi
          .fn()
          .mockResolvedValue(createCurrentUser(permissions)),
      } as Pick<CurrentUserServicePort, 'getCurrentUser'>,
    ),
  );
  app.use(errorHandler);
  return app;
}

describe('knowledge document upload', () => {
  it('binds personal uploads to the authenticated user', async () => {
    createDocument.mockClear();
    const response = await request(createTestApp())
      .post('/api/knowledge/documents')
      .send({
        scopeType: 'personal',
        fileName: '资料.txt',
        content: '正文',
      });

    expect(response.status).toBe(201);
    expect(createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        createdByUserId: userId,
        scope: { type: 'personal', ownerUserId: userId },
      }),
    );
  });

  it('requires organization knowledge permission', async () => {
    createDocument.mockClear();
    const denied = await request(createTestApp())
      .post('/api/knowledge/documents')
      .send({
        scopeType: 'organization',
        organizationId,
        fileName: '资料.md',
        content: '# 正文',
      });
    const allowed = await request(
      createTestApp(['organization:knowledge:manage']),
    )
      .post('/api/knowledge/documents')
      .send({
        scopeType: 'organization',
        organizationId,
        fileName: '资料.md',
        content: '# 正文',
      });

    expect(denied.status).toBe(403);
    expect(allowed.status).toBe(201);
    expect(createDocument).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported and empty documents', async () => {
    const unsupported = await request(createTestApp())
      .post('/api/knowledge/documents')
      .send({ scopeType: 'personal', fileName: '资料.pdf', content: '正文' });
    const empty = await request(createTestApp())
      .post('/api/knowledge/documents')
      .send({ scopeType: 'personal', fileName: '资料.txt', content: '  ' });

    expect(unsupported.status).toBe(400);
    expect(empty.status).toBe(400);
  });
});
