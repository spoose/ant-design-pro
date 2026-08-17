import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/appError.js';
import { sendSuccess } from '../http/response.js';
import { validateBody } from '../middleware/validate.js';
import type { KnowledgeDocumentRepository } from '../repositories/knowledgeDocumentRepository.js';
import type { CurrentUserServicePort } from '../services/currentUserService.js';

const fileName = z
  .string({ error: '文件名必须是字符串' })
  .trim()
  .min(1, '文件名不能为空')
  .max(255, '文件名不能超过 255 个字符')
  .regex(/^[^/\\]+\.(txt|md)$/i, '仅支持 TXT 或 Markdown 文件');
const content = z
  .string({ error: '正文必须是字符串' })
  .max(200_000, '正文不能超过 200000 个字符')
  .refine((value) => value.trim().length > 0, '正文不能为空');
const uploadKnowledgeDocumentSchema = z.discriminatedUnion('scopeType', [
  z.object({ scopeType: z.literal('personal'), fileName, content }).strict(),
  z
    .object({
      scopeType: z.literal('organization'),
      organizationId: z.uuid('organizationId 必须是有效 UUID'),
      fileName,
      content,
    })
    .strict(),
]);
type UploadKnowledgeDocumentRequest = z.infer<
  typeof uploadKnowledgeDocumentSchema
>;

const canUploadToOrganization = (
  permissions: readonly string[],
  isSuperAdmin: boolean,
) =>
  isSuperAdmin ||
  permissions.some((permission) =>
    ['*', 'organization:*', 'organization:knowledge:manage'].includes(
      permission,
    ),
  );

export function createKnowledgeDocumentsRouter(
  documents: Pick<KnowledgeDocumentRepository, 'create'>,
  currentUsers: Pick<CurrentUserServicePort, 'getCurrentUser'>,
): Router {
  const router = Router();

  router.post(
    '/',
    validateBody(uploadKnowledgeDocumentSchema),
    async (_request, response, next) => {
      try {
        const userId = response.locals.authenticatedUserId;
        const body = response.locals
          .validatedBody as UploadKnowledgeDocumentRequest;
        const user = await currentUsers.getCurrentUser(userId);

        if (body.scopeType === 'organization') {
          const organization = user.organizations.find(
            ({ organizationId }) => organizationId === body.organizationId,
          );
          if (
            !organization ||
            !canUploadToOrganization(
              organization.permissions,
              user.isSuperAdmin,
            )
          ) {
            throw new AppError({
              statusCode: 403,
              errorCode: 'KNOWLEDGE_UPLOAD_FORBIDDEN',
              errorMessage: '无权向指定组织上传资料',
            });
          }
        }

        sendSuccess(
          response,
          await documents.create({
            createdByUserId: userId,
            fileName: body.fileName,
            content: body.content,
            scope:
              body.scopeType === 'personal'
                ? { type: 'personal', ownerUserId: userId }
                : {
                    type: 'organization',
                    organizationId: body.organizationId,
                  },
          }),
          201,
        );
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
