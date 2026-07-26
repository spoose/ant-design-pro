// 真实后端联调阶段不注册 /api/register Mock。
// 如需恢复纯前端演示，可取消下面代码及类型导入的注释，并使用启用 Mock 的启动方式。
// import type { Request, Response } from 'express';

export default {
  /*
  'POST /api/register': (req: Request, res: Response) => {
    const { username, email, name } = req.body;
    res.status(201).send({
      success: true,
      data: {
        userId: 'mock-registered-user-id',
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        name,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      traceId: 'mock-register-trace-id',
    });
  },
  */
};
