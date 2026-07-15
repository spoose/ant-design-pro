# 后端认证与权限 API 清单（Bearer Only）

## 1. 选型

- 只使用 access JWT，不使用 Cookie 和 refresh token。
- 登录成功后，后端在 JSON 中返回 access token。
- 前端将 access token 保存到 localStorage。
- 后续请求通过 `Authorization: Bearer <jwt>` 认证。
- JWT 过期后后端返回 `401`，前端清理 token 并重新登录。
- 注册只需要用户名、密码和可选邮箱，不使用验证码。
- 注册成功后不自动登录、不返回 access token。
- `/api/currentUser` 一次返回用户、可访问系统和各系统权限。
- `/api/currentUser` 的每个 Context 返回 `page:*` 页面权限和后端过滤后的可用 `skillCodes`。
- 当前系统由前端管理，业务请求携带 `X-Context-Id`。

MVP 暂不实现：

- `POST /api/auth/refresh`
- `GET /api/csrf`
- `GET /api/login/captcha`
- `GET /api/loginEntries`
- 手机验证码登录

## 2. 接口总表

| 方法 | 路径 | 认证 | 用途 |
| --- | --- | --- | --- |
| `POST` | `/api/register` | 否 | 创建账户，不签发 JWT |
| `POST` | `/api/login/account` | 否 | 账号密码登录并返回 JWT |
| `GET` | `/api/currentUser` | Bearer JWT | 获取用户、系统上下文和权限 |
| `PUT` | `/api/users/me/default-entry` | Bearer JWT | 首次选择后保存长期默认系统 |
| `POST` | `/api/login/outLogin` | Bearer JWT | 可选的注销审计 |
| 按业务定义 | 业务接口 | Bearer JWT | JWT + `X-Context-Id` 鉴权 |

项目中已有但 MVP 不使用的认证接口：

| 方法 | 路径 | 当前来源 | MVP 处理 |
| --- | --- | --- | --- |
| `GET` | `/api/login/captcha` | 原手机号登录表单 | 不调用、不要求后端实现 |
| `POST` | `/api/auth/refresh` | 当前阶段性鉴权代码 | 删除调用，不要求后端实现 |
| `GET` | `/api/loginEntries` | 当前系统选择代码 | 合并进 `/api/currentUser` |

## 3. 通用结构

```ts
type ApiSuccess<T> = {
  success: true;
  data: T;
  traceId: string;
};

type ApiError = {
  success: false;
  errorCode: string;
  errorMessage: string;
  traceId: string;
};

type LoginRequest = {
  username: string;
  password: string;
  type: 'account';
  autoLogin?: boolean;
};

type RegisterRequest = {
  username: string;
  password: string;
  email?: string;
};

type RegisterData = {
  userId: string;
  username: string;
  email: string | null;
  status: 'ok';
};

type LoginResult = {
  status: 'ok';
  type: 'account';
  currentAuthority: string;
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: string;
  traceId: string;
};

type AuthCurrentUser = {
  userid: string;
  username: string;
  name: string;
  avatar: string | null;
  email: string | null;
  access?: string;
  defaultContextId?: string;
  contexts: AccessContext[];
};

type AccessContext = {
  id: string;
  systemId: string;
  systemCode: string;
  systemName: string;
  scopeType: 'system' | 'department';
  scopeId?: string;
  scopeName?: string;
  permissions: string[];
  skillCodes: string[];
};

```

## 4. 注册

MVP 复用项目已有的 `/api/register`。注册成功只创建账户，用户随后通过 `/api/login/account` 登录。

### `POST /api/register`

请求：

```http
POST /api/register
Content-Type: application/json
```

```json
{
  "username": "user1",
  "password": "example-password",
  "email": "user1@example.com"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "userId": "user1",
    "username": "user1",
    "email": "user1@example.com",
    "status": "ok"
  },
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `username` | `string` | 是 | 登录用户名，全局唯一 |
| `password` | `string` | 是 | 明文仅通过 HTTPS 传输，后端使用强密码哈希保存 |
| `email` | `string` | 否 | 可选邮箱；填写时校验格式、规范化并保存，暂不验证归属 |
| `userId` | `string` | 是 | 新用户唯一 ID |
| `status` | `"ok"` | 是 | 与项目现有注册成功状态名一致 |

前端可以保留 `confirm` 字段校验两次密码一致，但不发送给后端。后端必须独立校验用户名、密码强度和可选邮箱。MVP 不发送手机或邮箱验证码，也不包含邮箱激活流程。

## 5. 登录

### `POST /api/login/account`

请求：

```http
POST /api/login/account
Content-Type: application/json
```

```json
{
  "username": "user1",
  "password": "ant.design",
  "type": "account",
  "autoLogin": true
}
```

成功响应头：

```http
Cache-Control: no-store
Pragma: no-cache
```

响应：

```json
{
  "status": "ok",
  "type": "account",
  "currentAuthority": "user",
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "tokenType": "Bearer",
  "expiresIn": 7200,
  "expiresAt": "2026-07-14T08:00:00Z",
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `status` | `"ok"` | 是 | 兼容现有前端登录成功判断 |
| `type` | `"account"` | 是 | 当前仅支持账号密码登录 |
| `currentAuthority` | `string` | 是 | 兼容现有页面字段；正式权限以 `/api/currentUser` 为准 |
| `accessToken` | `string` | 是 | JWT access token |
| `tokenType` | `"Bearer"` | 是 | 固定为 `Bearer` |
| `expiresIn` | `number` | 是 | 剩余有效秒数 |
| `expiresAt` | `string` | 是 | 过期时间，ISO 8601 UTC |

`autoLogin` 是现有登录表单字段。由于 MVP 不使用 refresh token，后端可以接收但忽略该字段。

登录失败：

```http
HTTP/1.1 401 Unauthorized
```

```json
{
  "success": false,
  "errorCode": "BAD_CREDENTIALS",
  "errorMessage": "用户名或密码错误",
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

## 6. 获取用户、系统和权限

### `GET /api/currentUser`

请求：

```http
GET /api/currentUser
Authorization: Bearer <jwt>
```

响应：

```json
{
  "success": true,
  "data": {
    "userid": "user1",
    "username": "user1",
    "name": "用户一",
    "avatar": null,
    "email": "user1@example.com",
    "access": "user",
    "defaultContextId": "ctx-user1-sys1",
    "contexts": [
      {
        "id": "ctx-user1-sys1",
        "systemId": "sys1",
        "systemCode": "SYS1",
        "systemName": "系统一",
        "scopeType": "system",
        "permissions": [
          "page:home",
          "page:dashboard-analysis",
          "page:dashboard-workplace",
          "page:ai-assistant"
        ],
        "skillCodes": [
          "file-review",
          "document-summary",
          "knowledge-search"
        ]
      },
      {
        "id": "ctx-user1-sys2",
        "systemId": "sys2",
        "systemCode": "SYS2",
        "systemName": "系统二",
        "scopeType": "system",
        "permissions": [
          "page:home",
          "page:dashboard-analysis",
          "page:dashboard-monitor",
          "page:ai-assistant"
        ],
        "skillCodes": ["file-review", "knowledge-search"]
      }
    ]
  },
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

要求：

- `data` 直接是当前用户对象，兼容现有前端的 `msg.data` 读取方式。
- `userid` 沿用当前 `API.CurrentUser` 字段名。
- `contexts` 只返回当前用户可访问的上下文。
- `permissions` 当前只使用 `page:*` 权限码；一个权限码对应一个完整页面访问权，同时控制菜单、静态路由和该页面对应的业务接口。
- `skillCodes` 表示后端根据当前用户和 Context 过滤后的 AI Skill 占位，不返回用户不可用的 Skill。
- `permissions` 与 `skillCodes` 是 `AccessContext` 的并列字段，不把 Skill 嵌套进某一个 Permission。
- Skill 当前只用于前端展示，并统一跳转项目 AI 助手；业务接口仍必须按 `permissions` 做后端鉴权，不能因为请求携带 Skill Code 就放行。
- `defaultContextId` 是跨标签页、跨登录使用的长期默认系统，可由默认系统接口修改。
- `currentUser` 不返回、不重新签发 access token。

### Skill 数据约定

当前阶段不增加独立 Skill 接口，`permissions` 和 `skillCodes` 随 `/api/currentUser` 一次返回。前端切换 Context 后，直接读取该 Context 已返回的数据，不需要再次请求后端。

```text
currentUser
  └── contexts[]
        ├── permissions[]
        └── skillCodes[]
```

后端数据库可以继续规范化拆分 `permissions`、`skills`、Scope 与 Skill 的关联；这里只约束 API 聚合响应，不要求将 Skill 物理存入用户表或 Context 表。

前端静态 Skill Registry 根据 `skillCode` 补充名称和图标，并在当前阶段统一跳转项目 AI 助手。后端只返回稳定、唯一的 Skill Code，不返回 React 组件路径，也不信任前端提交的 Skill Code 作为授权依据。

当单个用户的 Context 或 Skill 数量明显增大，或者权限需要频繁刷新时，再考虑拆为一个聚合接口：

```http
GET /api/contexts/{contextId}/access
```

该扩展接口应一次返回当前 Context 的 `permissions` 和 `skillCodes`，避免拆成两个请求造成状态不同步；MVP 不实现该接口。

JWT 缺失、无效或过期时返回 `401`，前端删除 localStorage token 并转到登录页。

## 7. 设置默认系统

### `PUT /api/users/me/default-entry`

该路径沿用项目已有命名。用户首次没有默认系统时，选择页调用一次；首页顶部的临时系统切换不调用此接口。

请求：

```http
PUT /api/users/me/default-entry
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{
  "entryId": "ctx-user1-sys1"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "defaultContextId": "ctx-user1-sys1"
  },
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

要求：

- 后端必须确认 `entryId` 属于 JWT `sub` 对应用户。
- 成功响应必须回传最终保存的 `defaultContextId`。
- 前端只把当前标签页选择存入 sessionStorage；刷新优先使用该值，再使用后端默认值。

## 8. 业务接口

请求示例：

```http
GET /api/dashboard/summary
Authorization: Bearer <jwt>
X-Context-Id: ctx-user1-sys1
```

响应示例：

```json
{
  "success": true,
  "data": {
    "systemCode": "SYS1",
    "total": 12
  },
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

后端必须按顺序校验：

1. JWT 签名、`exp`、`iss` 和 `aud`。
2. 从 JWT `sub` 获取用户 ID。
3. `X-Context-Id` 属于该用户。
4. 后端数据库或可信缓存中的当前权限。
5. 当前业务操作所需权限。

前端不向后端传递权限码。

## 8. 注销

Bearer-only MVP 的注销由前端完成：

```ts
localStorage.removeItem('accessToken');
```

### `POST /api/login/outLogin`（可选）

如后端需要记录注销审计，前端在删除 token 前调用：

```http
POST /api/login/outLogin
Authorization: Bearer <jwt>
```

```json
{
  "success": true,
  "data": null,
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

纯无状态 JWT 无法立即撤销已签发 token。如需强制下线，后续增加 `jti` 黑名单或用户 `tokenVersion`。

## 9. 错误码

| HTTP | `errorCode` | 含义 |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | 请求字段不合法 |
| `400` | `CONTEXT_REQUIRED` | 缺少 `X-Context-Id` |
| `409` | `ACCOUNT_ALREADY_EXISTS` | 用户名已存在，或填写的邮箱已被占用 |
| `401` | `BAD_CREDENTIALS` | 用户名或密码错误 |
| `401` | `ACCESS_TOKEN_MISSING` | 未携带 Bearer token |
| `401` | `ACCESS_TOKEN_INVALID` | JWT 签名或 Claims 无效 |
| `401` | `ACCESS_TOKEN_EXPIRED` | JWT 过期，需重新登录 |
| `403` | `CONTEXT_FORBIDDEN` | 用户无权使用指定上下文 |
| `403` | `PERMISSION_DENIED` | 当前上下文缺少功能权限 |
| `500` | `INTERNAL_ERROR` | 后端异常 |

## 10. 后端配置要求

- Spring Security 使用 `SessionCreationPolicy.STATELESS`。
- 从 `Authorization` Header 提取 Bearer JWT。
- JWT 不得记录到服务器日志、链路字段或错误信息。
- 密码不得写入日志。
- CORS 只允许 `https://app.example.com`，不使用 `*`。
- CORS 允许 `Content-Type`、`Authorization` 和 `X-Context-Id` Header。
- `OPTIONS` 预检请求不要求登录。
- Bearer Header 不会被浏览器自动携带，MVP 不需要 CSRF Token。
- 建议配置严格 CSP 并限制第三方脚本，降低 localStorage token 被 XSS 窃取的风险。

## 11. 前端系统上下文规则

- 前端使用当前标签页 `sessionStorage` 保存 `currentContextId`。
- 刷新时优先使用仍存在于 `contexts` 的已存储 ID。
- 无有效存储 ID 时使用 `currentUser.defaultContextId`。
- 两者都不存在时显示系统选择页。
- 切换系统只更新前端 `currentContextId`，不调用后端切换接口。
- MVP 不保存跨标签页、跨设备的新默认系统。
