# 前后端认证与系统权限接口清单（MVP）

## 1. 已确认选型

- 前端：`https://app.example.com`
- API：`https://api.example.com`
- 只使用 access JWT，不使用 refresh token。
- JWT 过期后返回 `401`，用户重新登录。
- 提供两个独立登录入口：Cookie 模式和 Bearer 模式。
- 前端每次部署只启用一种模式，不在运行时混用。
- `/api/currentUser` 一次返回用户、可访问系统和各系统权限。
- 当前系统由前端管理，业务请求携带 `X-Context-Id`。

MVP 暂不实现：

- `POST /api/auth/refresh`
- `GET /api/csrf`
- `GET /api/loginEntries`
- `PUT /api/users/me/default-entry`
- 手机验证码登录

## 2. 接口总表

| 接口 | 方法 | 用途 | Cookie 模式 | Bearer 模式 |
| --- | --- | --- | --- | --- |
| `/api/login/account` | `POST` | Cookie 登录 | 使用 | 不使用 |
| `/api/login/token` | `POST` | Bearer 登录 | 不使用 | 使用 |
| `/api/currentUser` | `GET` | 获取用户、系统和权限 | 共用 | 共用 |
| `/api/login/outLogin` | `POST` | 注销 | 必须 | 可选审计 |
| 业务接口 | 按业务定义 | 业务数据和操作 | 共用 | 共用 |

## 3. 通用响应

### 成功

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `success` | `boolean` | 是 | 固定为 `true` |
| `data` | `T` | 是 | 业务数据，无数据时为 `null` |
| `traceId` | `string` | 是 | 链路跟踪 ID |

```json
{
  "success": true,
  "data": {},
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

### 失败

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `success` | `boolean` | 是 | 固定为 `false` |
| `errorCode` | `string` | 是 | 稳定的机器可读错误码 |
| `errorMessage` | `string` | 是 | 可展示错误信息 |
| `traceId` | `string` | 是 | 链路跟踪 ID |

```json
{
  "success": false,
  "errorCode": "PERMISSION_DENIED",
  "errorMessage": "没有当前系统的操作权限",
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

`401/403` 必须使用对应 HTTP 状态，不使用 `HTTP 200 + success: false`。

## 4. 通用登录请求

Cookie 和 Bearer 登录使用相同请求体。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `username` | `string` | 是 | 用户名 |
| `password` | `string` | 是 | 密码 |

```json
{
  "username": "user1",
  "password": "ant.design"
}
```

`type` 和 `autoLogin` 不传给后端，登录交付方式已由接口路径区分。

## 5. Cookie 登录

### `POST /api/login/account`

请求：

```http
POST /api/login/account
Content-Type: application/json
Origin: https://app.example.com
```

成功响应头：

```http
Set-Cookie: ACCESS_TOKEN=<jwt>; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=7200
```

响应 `data`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `authenticated` | `boolean` | 是 | 固定为 `true` |
| `expiresAt` | `string` | 是 | JWT 过期时间，ISO 8601 UTC |

```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "expiresAt": "2026-07-14T08:00:00Z"
  },
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

- JWT 只在 Cookie 中交付，响应 JSON 不得返回 `accessToken`。
- 前端统一使用 `withCredentials: true`。
- 前端 JavaScript 不读取、不保存 JWT。

## 6. Bearer 登录

### `POST /api/login/token`

请求：

```http
POST /api/login/token
Content-Type: application/json
```

成功响应头：

```http
Cache-Control: no-store
Pragma: no-cache
```

响应 `data`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `accessToken` | `string` | 是 | JWT access token |
| `tokenType` | `"Bearer"` | 是 | 固定为 `Bearer` |
| `expiresIn` | `number` | 是 | 剩余有效秒数 |
| `expiresAt` | `string` | 是 | JWT 过期时间，ISO 8601 UTC |

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 7200,
    "expiresAt": "2026-07-14T08:00:00Z"
  },
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

- 该接口不得设置 `ACCESS_TOKEN` Cookie。
- 前端可将 `accessToken` 保存到 localStorage，后续通过 Bearer Header 发送。
- JWT 不得记录到服务器日志、链路字段或错误信息。

## 7. 获取用户、系统和权限

### `GET /api/currentUser`

Cookie 模式请求：

```http
GET /api/currentUser
Cookie: ACCESS_TOKEN=<jwt>
```

Bearer 模式请求：

```http
GET /api/currentUser
Authorization: Bearer <jwt>
```

顶层 `data`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `user` | `AuthenticatedUser` | 是 | 当前登录用户 |
| `contexts` | `AccessContext[]` | 是 | 用户可访问的系统/部门及权限 |

`AuthenticatedUser`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 稳定用户 ID |
| `username` | `string` | 是 | 登录名 |
| `name` | `string` | 是 | 展示名称 |
| `avatar` | `string \| null` | 是 | 头像 URL，无头像时为 `null` |
| `defaultContextId` | `string` | 否 | 后端预配置的默认上下文；MVP 不提供修改接口 |

`AccessContext`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 授权上下文 ID，业务请求用作 `X-Context-Id` |
| `systemId` | `string` | 是 | 系统 ID |
| `systemCode` | `string` | 是 | 系统稳定编码 |
| `systemName` | `string` | 是 | 系统展示名称 |
| `scopeType` | `"system" \| "department"` | 是 | 授权范围类型 |
| `scopeId` | `string` | 否 | 部门或范围 ID |
| `scopeName` | `string` | 否 | 部门或范围名称 |
| `permissions` | `string[]` | 是 | 该用户在此上下文的 `page:*` 页面权限码 |

完整响应：

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user1",
      "username": "user1",
      "name": "用户一",
      "avatar": null,
      "defaultContextId": "ctx-user1-sys1"
    },
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
        ]
      }
    ]
  },
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

`currentUser` 不得返回或重新签发 access token。

## 8. 业务接口

所有按系统/部门隔离的业务接口必须接收：

```http
X-Context-Id: ctx-user1-sys1
```

Cookie 模式示例：

```http
GET /api/dashboard/summary
Cookie: ACCESS_TOKEN=<jwt>
X-Context-Id: ctx-user1-sys1
```

Bearer 模式示例：

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

后端必须：

1. 校验 JWT 签名、`exp`、`iss` 和 `aud`。
2. 从 JWT `sub` 获取用户 ID。
3. 校验 `X-Context-Id` 属于该用户。
4. 从后端数据库或可信缓存读取权限。
5. 校验当前业务操作所需权限。

前端不传权限码，后端不得信任前端展示状态。

## 9. 注销

### `POST /api/login/outLogin`

Cookie 模式响应头：

```http
Set-Cookie: ACCESS_TOKEN=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0
```

统一响应：

```json
{
  "success": true,
  "data": null,
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

- Cookie 模式必须调用该接口清除 Cookie。
- Bearer 模式最小注销由前端删除 localStorage token，该接口可用于记录审计日志。
- 纯无状态 JWT 无法立即撤销已签发 token；如需踢人，后续增加 `jti` 黑名单或 `tokenVersion`。

## 10. 凭证冲突规则

受保护请求同时包含 Cookie JWT 和 Bearer JWT 时，后端必须拒绝，不得静默选择优先级。

```http
HTTP/1.1 400 Bad Request
```

```json
{
  "success": false,
  "errorCode": "MULTIPLE_AUTH_CREDENTIALS",
  "errorMessage": "请求包含多种认证凭证",
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

## 11. 错误码

| HTTP | `errorCode` | 含义 |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | 请求字段不合法 |
| `400` | `CONTEXT_REQUIRED` | 缺少 `X-Context-Id` |
| `400` | `MULTIPLE_AUTH_CREDENTIALS` | 同时提供 Cookie 和 Bearer JWT |
| `401` | `BAD_CREDENTIALS` | 用户名或密码错误 |
| `401` | `ACCESS_TOKEN_MISSING` | 未携带认证凭证 |
| `401` | `ACCESS_TOKEN_INVALID` | JWT 签名或 Claims 无效 |
| `401` | `ACCESS_TOKEN_EXPIRED` | JWT 已过期，需要重新登录 |
| `403` | `ORIGIN_FORBIDDEN` | Cookie 模式修改请求的 Origin 不被允许 |
| `403` | `CONTEXT_FORBIDDEN` | 用户无权使用指定上下文 |
| `403` | `PERMISSION_DENIED` | 当前上下文缺少功能权限 |
| `500` | `INTERNAL_ERROR` | 未预期后端错误 |

## 12. Cookie、CORS 和 Origin

Cookie 模式：

```http
Set-Cookie: ACCESS_TOKEN=<jwt>; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=7200
```

- 生产环境必须使用 HTTPS。
- 不设置 `Domain=.example.com`，Cookie 保持为 `api.example.com` Host-only。
- Cookie `Max-Age` 不得超过 JWT `exp`。
- MVP 暂不接入 CSRF Token，Cookie 模式的 `POST/PUT/PATCH/DELETE` 必须校验 `Origin` 严格等于 `https://app.example.com`。

CORS：

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: Content-Type, Authorization, X-Context-Id
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
```

- `Access-Control-Allow-Origin` 不得使用 `*`。
- `OPTIONS` 预检请求不要求登录。
- Cookie 模式前端统一设置 `withCredentials: true`。
- Bearer 模式前端发送 `Authorization: Bearer <jwt>`，不依赖 Cookie。

## 13. 前端系统上下文规则

- 前端在当前标签页 `sessionStorage` 保存 `currentContextId`。
- 页面刷新时，优先使用仍存在于 `contexts` 的已存储 ID。
- 无有效存储 ID 时使用 `user.defaultContextId`。
- 两者都不存在时显示系统选择页。
- 切换系统只更新前端 `currentContextId`，不调用后端切换接口。
- MVP 不保存用户新选的跨标签页、跨设备默认系统。
