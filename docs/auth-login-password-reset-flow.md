# 登录与密码重置链路

本文描述当前 React、Umi 请求层、Express 和 MySQL 之间的真实认证链路。API JSON 字段仍以 [`backend-auth-api-bearer-only.md`](./backend-auth-api-bearer-only.md) 为唯一事实来源。

## 1. 账号密码登录

```text
/user/login
  → loginWithPassword({ account, password })
  → Umi /api 代理（保留浏览器 Origin）
  → POST /api/login/account
  → Zod loginSchema
  → AuthService.login
  → UserRepository.findAuthenticationUserByAccount
  → Argon2id verifyLogin
  → AccessTokenService.issue JWT
  → 前端保存 data.accessToken
  → POST /api/currentUser/get + Authorization: Bearer <jwt>
  → authenticate 校验签名、Claims、用户状态和 tokenVersion
  → CurrentUserService / UserRepository 查询实时授权
  → resolveLandingPath 选择 Platform、Organization、组织选择或 403
```

核心接口：

- `POST /api/login/account`：`{ account, password }`。
- `POST /api/currentUser/get`：Bearer JWT，返回用户与实时授权。

核心文件：

- 前端页面：`src/pages/user/login/index.tsx`
- 前端请求：`src/services/auth.ts`
- Token 生命周期：`src/utils/authToken.ts`
- 请求拦截与错误：`src/requestErrorConfig.ts`
- 登录态恢复：`src/app.tsx`
- 登录落点：`src/utils/workspaceRoutes.ts`
- 开发代理：`config/proxy.ts`
- Express 路由：`server/src/routes/auth.ts`
- 请求校验：`server/src/schemas/auth.ts`
- 登录服务：`server/src/services/authService.ts`
- 密码哈希：`server/src/services/passwordService.ts`
- JWT：`server/src/services/accessTokenService.ts`
- 用户查询：`server/src/repositories/userRepository.ts`
- 鉴权中间件：`server/src/middleware/auth.ts`

## 2. 忘记与重置密码

```text
/user/forgot-password
  → POST /api/password/forgot { email }
  → 生成 32-byte 随机 Token
  → MySQL 只保存 SHA-256 Hash，15 分钟过期
  → 开发环境把一次性 Token 返回给本机前端
  → /user/reset-password?token=...
  → POST /api/password/reset { token, password }
  → Argon2id Hash 新密码
  → 事务锁定 Token，检查未使用且未过期
  → 更新 password_hash，token_version + 1
  → 标记该用户全部未使用重置 Token 为已使用
  → 返回登录页，旧密码和旧 JWT 均失效
```

核心接口：

- `POST /api/password/forgot`：`{ email }`。
- `POST /api/password/reset`：`{ token, password }`。

核心文件：

- 前端页面：`src/pages/user/forgot-password/index.tsx`、`src/pages/user/reset-password/index.tsx`
- 前端请求：`src/services/auth.ts`
- Express 路由：`server/src/routes/passwordReset.ts`
- 请求校验：`server/src/schemas/passwordReset.ts`
- Token 与重置规则：`server/src/services/passwordResetService.ts`
- 原子消费事务：`server/src/repositories/passwordResetRepository.ts`
- 数据表：`server/migrations/002_password_reset_tokens.sql`

## 3. 当前投递边界

当前仓库没有 SMTP 配置。开发环境通过响应中的 `developmentResetToken` 跑通本机闭环；生产环境不会返回 Token，并明确返回 `503 PASSWORD_RESET_DELIVERY_UNAVAILABLE`。接入 SMTP 时只替换 Token 投递边界，Token Hash、过期、单次消费和密码更新事务保持不变。
