# 后端认证与权限 API 清单（MVP）

## 选型

- 只使用 access JWT，不使用 refresh token。
- Cookie 和 Bearer 使用独立登录接口，每个前端部署只启用一种模式。
- `/api/currentUser` 一次返回用户、可访问系统和权限。
- 暂无 `/api/auth/refresh`、`/api/csrf`、`/api/loginEntries` 和 default-entry 写接口。

## 接口

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `POST` | `/api/login/account` | HttpOnly Cookie 登录 |
| `POST` | `/api/login/token` | Bearer/localStorage 登录 |
| `GET` | `/api/currentUser` | 用户、系统上下文和权限 |
| `POST` | `/api/login/outLogin` | Cookie 注销；Bearer 模式可用于审计 |
| 按业务定义 | 业务接口 | JWT + `X-Context-Id` 鉴权 |

## 通用结构

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

type AccountLoginRequest = {
  username: string;
  password: string;
};

type CookieLoginData = {
  authenticated: true;
  expiresAt: string;
};

type BearerLoginData = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: string;
};

type AuthenticatedUser = {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  defaultContextId?: string;
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
};

type AuthBootstrap = {
  user: AuthenticatedUser;
  contexts: AccessContext[];
};
```

## 1. Cookie 登录

```http
POST /api/login/account
Content-Type: application/json
Origin: https://app.example.com
```

```json
{
  "username": "user1",
  "password": "ant.design"
}
```

```http
Set-Cookie: ACCESS_TOKEN=<jwt>; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=7200
```

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

Cookie 模式响应 JSON 不返回 `accessToken`。

## 2. Bearer 登录

```http
POST /api/login/token
Content-Type: application/json
```

请求体与 Cookie 登录一致。

```http
Cache-Control: no-store
Pragma: no-cache
```

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

Bearer 登录不设置 `ACCESS_TOKEN` Cookie。

## 3. 用户与权限初始化

```http
GET /api/currentUser
```

Cookie 模式由浏览器自动携带 `ACCESS_TOKEN` Cookie。Bearer 模式携带：

```http
Authorization: Bearer <jwt>
```

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

`currentUser` 不返回、不刷新 access token。

## 4. 业务请求

```http
GET /api/dashboard/summary
X-Context-Id: ctx-user1-sys1
```

Cookie 模式自动携带 Cookie；Bearer 模式额外携带 `Authorization` Header。

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

后端必须校验 JWT、用户与 `X-Context-Id` 的归属关系，以及该上下文的功能权限。

## 5. 注销

```http
POST /api/login/outLogin
```

Cookie 模式清除 Cookie：

```http
Set-Cookie: ACCESS_TOKEN=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0
```

```json
{
  "success": true,
  "data": null,
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

Bearer 模式最小注销由前端删除 localStorage token。

## 错误码

| HTTP | `errorCode` | 含义 |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | 请求字段不合法 |
| `400` | `CONTEXT_REQUIRED` | 缺少 `X-Context-Id` |
| `400` | `MULTIPLE_AUTH_CREDENTIALS` | 同时提供 Cookie 和 Bearer JWT |
| `401` | `BAD_CREDENTIALS` | 用户名或密码错误 |
| `401` | `ACCESS_TOKEN_MISSING` | 未携带凭证 |
| `401` | `ACCESS_TOKEN_INVALID` | JWT 无效 |
| `401` | `ACCESS_TOKEN_EXPIRED` | JWT 过期，需重新登录 |
| `403` | `ORIGIN_FORBIDDEN` | Cookie 模式的 Origin 不允许 |
| `403` | `CONTEXT_FORBIDDEN` | 用户无权使用上下文 |
| `403` | `PERMISSION_DENIED` | 缺少功能权限 |
| `500` | `INTERNAL_ERROR` | 后端异常 |

## 后端强制规则

- JWT 校验 `signature`、`exp`、`iss` 和 `aud`，从 `sub` 取用户 ID。
- 同时收到 Cookie JWT 和 Bearer JWT 时返回 `400 MULTIPLE_AUTH_CREDENTIALS`。
- Cookie 保持 Host-only，不设置 `Domain=.example.com`。
- Cookie 模式前端使用 `withCredentials: true`。
- CORS 精确允许 `https://app.example.com`，允许 `Authorization` 和 `X-Context-Id`，不使用 `*`。
- MVP 暂无 CSRF Token，Cookie 模式的修改请求必须严格校验 `Origin`。
- 权限码只用于前端显示；业务接口必须在后端重新校验。
