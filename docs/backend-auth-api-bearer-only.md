# 认证与权限 API 契约（Bearer Only）

> 状态：当前实现基线
>
> 更新：2026-08-05
>
> 运行时事实来源：`server/src/app.ts`、`server/src/routes/`、`server/src/schemas/`
>
> 前端生成契约：`openapi/jushu-api.json`

本文只描述认证、用户偏好、Super Admin 用户与组织管理接口。AI 接口不在本文范围内。

## 1. 基本约定

- 认证方式仅使用 `Authorization: Bearer <accessToken>`，不使用 Cookie Session。
- 受保护接口从 JWT 的 `sub` 获取当前用户，不接受客户端传入目标用户 ID。
- Access Token 为 HS256 JWT，校验 `sub`、`iss`、`aud`、`iat`、`exp`、`jti` 和 `tokenVersion`。
- 鉴权时会实时校验用户状态与数据库中的 `tokenVersion`。
- Super Admin 接口在普通认证后继续实时校验 `isSuperAdmin`。
- 请求体和查询参数使用严格 Schema；未知字段会返回 `VALIDATION_ERROR`。
- 所有响应包含 `traceId`，5xx 错误只向客户端返回安全信息。

## 2. 当前接口状态

### 已实现

| 方法 | 路径 | 认证 | 说明 |
| --- | --- | --- | --- |
| `POST` | `/api/register` | 否 | 注册普通用户 |
| `POST` | `/api/login/account` | 否 | 用户名或邮箱登录 |
| `POST` | `/api/password/forgot` | 否 | 请求密码重置；当前仅开发模式可交付 Token |
| `POST` | `/api/password/reset` | 否 | 使用一次性 Token 重置密码 |
| `GET` | `/api/currentUser` | Bearer | 获取当前用户及实时访问范围 |
| `PUT` | `/api/users/me/default-organization` | Bearer | 更新当前用户默认组织 |
| `POST` | `/api/login/outLogin` | Bearer | 确认退出请求 |
| `GET` | `/api/admin/users` | Super Admin | 分页查询用户 |
| `GET` | `/api/admin/organizations` | Super Admin | 查询组织 |
| `POST` | `/api/admin/organizations` | Super Admin | 创建组织 |
| `PATCH` | `/api/admin/organizations/:organizationId` | Super Admin | 更新组织 |
| `DELETE` | `/api/admin/organizations/:organizationId` | Super Admin | 删除未投入使用的组织 |

### 已注册但未实现

以下接口固定返回 HTTP `501` 和 `FEATURE_NOT_IMPLEMENTED`：

- `POST /api/admin/users`
- `PATCH /api/admin/users/:userId`
- `DELETE /api/admin/users/:userId`

### 尚未注册

以下能力属于后续目标，不应由前端当作可用接口调用：

- `GET /api/admin/users/:userId`
- 用户 Platform/Organization 授权快照与更新接口
- 权限、Skill、DataScope 目录接口
- DataScope 管理接口

## 3. 通用响应

成功响应：

```ts
interface ApiSuccess<T> {
  success: true;
  data: T;
  traceId: string;
}
```

失败响应：

```ts
interface ApiError {
  success: false;
  errorCode: string;
  errorMessage: string;
  details?: Record<string, unknown>;
  traceId: string;
}
```

业务失败不得返回 `200` 后再通过 `success: false` 表达。

## 4. 核心结构

```ts
type UserStatus = 'active' | 'disabled' | 'deleted';

interface OrganizationAccess {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  permissions: string[];
  skillCodes: string[];
  dataScopes: [];
  defaultDataScopeId: null;
}

interface AuthCurrentUser {
  userId: string;
  username: string;
  name: string;
  avatar: string | null;
  email: string;
  status: UserStatus;
  isSuperAdmin: boolean;
  platformPermissions: string[];
  platformSkillCodes: string[];
  defaultOrganizationId: string | null;
  organizations: OrganizationAccess[];
}
```

当前版本仅预留 DataScope 字段，因此 `dataScopes` 固定为空数组，`defaultDataScopeId` 固定为 `null`。

`defaultOrganizationId` 只有在用户仍具有该活动组织的活动 Membership 时才会返回，否则归一化为 `null`。

## 5. 认证与账户

### `POST /api/register`

请求：

```ts
interface RegisterRequest {
  username: string; // 3–64，仅字母、数字、点、下划线、连字符；转为小写
  email: string;    // 有效邮箱，最长 254；转为小写
  name: string;     // 1–120
  password: string; // 12–128
}
```

成功返回 HTTP `201`，`data` 包含 `userId`、`username`、`email`、`name` 和 `status: 'active'`。密码使用 Argon2id 哈希，任何响应均不得返回密码或哈希。

### `POST /api/login/account`

请求：

```ts
interface LoginRequest {
  account: string;  // 用户名或邮箱；转为小写
  password: string;
}
```

成功返回：

```ts
interface IssuedAccessToken {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: string;
}
```

登录响应设置 `Cache-Control: no-store` 和 `Pragma: no-cache`。账号不存在、密码错误和账号非活动状态统一返回 `BAD_CREDENTIALS`，避免枚举账号。

### `GET /api/currentUser`

成功返回 `AuthCurrentUser`。Platform 与 Organization 授权均从数据库实时聚合：

- Platform Grant 来自 `scope_type = 'platform'` 且 `organization_id IS NULL`。
- Organization 只包含活动 Membership 和活动组织。
- Organization Grant 仅在对应 Membership 存在时有效。

### `POST /api/password/forgot`

请求为 `{ email: string }`，成功返回 HTTP `202`。开发模式返回一次性 `developmentResetToken`，有效期 15 分钟；无论邮箱是否存在都保持相同响应形态。

生产模式尚未配置邮件交付，明确返回 HTTP `503` 和 `PASSWORD_RESET_DELIVERY_UNAVAILABLE`，不得把开发 Token 暴露到生产环境。

### `POST /api/password/reset`

请求为 `{ token: string; password: string }`。Token 长度为 32–512，新密码长度为 12–128。Token 在数据库中仅保存 SHA-256 摘要，成功使用后失效；更新密码时同时递增 `tokenVersion`，使旧 Access Token 失效。

### `POST /api/login/outLogin`

当前返回：

```json
{
  "loggedOut": true,
  "serverTokenRevoked": false
}
```

当前 Access Token 为无状态 Token，退出主要由客户端删除本地 Token 完成；服务端撤销列表尚未实现。

## 6. 默认组织

### `PUT /api/users/me/default-organization`

请求：

```json
{ "organizationId": "UUID" }
```

后端只允许保存当前用户可进入的活动组织。组织不存在、已停用、Membership 不存在或已停用时，统一返回 HTTP `403` 和 `ORGANIZATION_FORBIDDEN`，避免泄露组织目录。

成功返回 `{ "defaultOrganizationId": "UUID" }`。该接口只更新登录偏好，不修改 Membership、Grant 或 `tokenVersion`。

## 7. Super Admin 用户接口

### `GET /api/admin/users`

查询参数：

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `page` | 是 | 1–1,000,000 的字符串形式整数 |
| `pageSize` | 是 | 1–100 的字符串形式整数 |
| `keyword` | 否 | 1–120，匹配用户名、邮箱或名称 |
| `status` | 否 | `active`、`disabled` 或 `deleted` |
| `sortBy` | 否 | `username`、`email`、`name`、`status`、`createdAt`；默认 `createdAt` |
| `sortOrder` | 否 | `asc` 或 `desc`；默认 `desc` |

返回：

```ts
interface AdminUserPage {
  list: Array<{
    userId: string;
    username: string;
    email: string;
    name: string;
    avatar: string | null;
    status: UserStatus;
    isSuperAdmin: boolean;
    defaultOrganizationId: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  }>;
  page: number;
  pageSize: number;
  total: number;
}
```

用户新增、更新和删除路由仅为前端联调预留，当前不能用于生产管理。

## 8. Super Admin 组织接口

```ts
type OrganizationStatus = 'active' | 'disabled';

interface OrganizationSummary {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}
```

- `GET /api/admin/organizations`：返回 `OrganizationSummary[]`。
- `POST /api/admin/organizations`：请求包含 `organizationCode`、`organizationName`、`status`，成功返回 HTTP `201`。编码为 2–64 个字符并转为大写。
- `PATCH /api/admin/organizations/:organizationId`：只允许更新 `organizationName` 和 `status`，且至少包含一个字段。
- `DELETE /api/admin/organizations/:organizationId`：成功返回 `{ organizationId }`。

创建组织时，在同一事务中创建组织、创建者 Membership，并写入创建者的初始组织权限与 Skill。删除只允许以下两种情况：

1. 组织没有成员或授权；
2. 组织仅保留创建时生成的创建者 Membership 和初始授权，后端会在同一事务中先删 Grant、再删 Membership 和组织。

存在额外成员或授权时返回 `ORGANIZATION_IN_USE`。

## 9. 当前权限目录

Super Admin Platform Permission：

```text
platform:organization:create
platform:organization:update
platform:organization:delete
platform:user:manage
platform:permission:grant
platform:audit:view
```

Platform Skill：`platform-assistant`、`file-review`、`document-summary`、`knowledge-search`。

Organization 初始权限为 `organization:*`；Organization Skill 为 `file-review`、`document-summary`、`knowledge-search`。

这些常量目前由后端代码控制；面向管理端的授权目录 API 尚未实现。

## 10. 主要错误码

| HTTP | `errorCode` | 场景 |
| --- | --- | --- |
| 400 | `INVALID_JSON` | 请求体不是有效 JSON |
| 400 | `VALIDATION_ERROR` | 请求体、路径或查询参数不合法 |
| 400 | `PASSWORD_RESET_TOKEN_INVALID` | 重置 Token 无效、过期或已使用 |
| 401 | `BAD_CREDENTIALS` | 登录失败 |
| 401 | `ACCESS_TOKEN_MISSING` | 缺少 Bearer Token |
| 401 | `ACCESS_TOKEN_INVALID` | Token、用户状态或 `tokenVersion` 无效 |
| 401 | `ACCESS_TOKEN_EXPIRED` | Token 已过期 |
| 403 | `SUPER_ADMIN_REQUIRED` | 需要 Super Admin |
| 403 | `ORGANIZATION_FORBIDDEN` | 当前用户不能进入指定组织 |
| 409 | `ACCOUNT_ALREADY_EXISTS` | 用户名或邮箱已存在 |
| 409 | `ORGANIZATION_CODE_EXISTS` | 组织编码已存在 |
| 409 | `ORGANIZATION_IN_USE` | 组织包含非初始化成员或授权 |
| 404 | `ORGANIZATION_NOT_FOUND` | 组织不存在 |
| 404 | `ROUTE_NOT_FOUND` | 接口不存在 |
| 501 | `FEATURE_NOT_IMPLEMENTED` | 已注册的用户写接口尚未实现 |
| 503 | `DATABASE_UNAVAILABLE` | 数据库不可用 |
| 503 | `PASSWORD_RESET_DELIVERY_UNAVAILABLE` | 生产密码重置交付未配置 |

未预期异常统一返回 HTTP `500` 和 `INTERNAL_ERROR`。

## 11. OpenAPI 与维护边界

`openapi/jushu-api.json` 当前覆盖前端已生成调用的四个接口：注册、登录、当前用户和默认组织。密码重置及 Super Admin 管理接口尚未全部纳入该文件。

接口变更时按以下顺序维护：

1. 更新后端路由、Schema 和测试；
2. 更新 `openapi/jushu-api.json`；
3. 运行 `npm run openapi` 重新生成前端服务；
4. 更新本文的状态表和关键约束。

不要手工编辑 `src/services/ant-design-pro/`。
