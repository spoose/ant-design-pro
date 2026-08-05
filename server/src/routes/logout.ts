import type { RequestHandler } from 'express';
import { Router } from 'express';
import { sendSuccess } from '../http/response.js';

export type LogoutAcknowledgement = {
  loggedOut: true;
  serverTokenRevoked: false;
};

/**
 * 当前阶段只确认经过认证的退出请求，不声明已经撤销无状态 Access Token。
 *
 * 未来链路：authenticate 解析 jti/exp -> Redis 写入撤销标记
 * -> 返回 serverTokenRevoked: true -> 后续 authenticate 查询撤销标记。
 */
export function createLogoutRouter(authenticate: RequestHandler): Router {
  const router = Router();

  router.post('/', authenticate, (_request, response) => {
    sendSuccess<LogoutAcknowledgement>(response, {
      loggedOut: true,
      serverTokenRevoked: false,
    });
  });

  return router;
}
