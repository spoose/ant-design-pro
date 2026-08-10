# 认证与权限 API 契约（Bearer Only）


> 更新：2026-08-07
>
> 运行时事实来源：`server/src/app.ts`、`server/src/routes/`、`server/src/schemas/`
>
> 前端生成契约：`openapi/jushu-api.json`

本文只描述认证、用户偏好、Super Admin 用户与组织管理接口。AI 接口不在本文范围内。

## 1. 基本约定

- 认证方式仅使用 `Authorization: Bearer <accessToken>`，未使用 Cookie Session。
- 受保护接口从 JWT 的 `sub` 获取当前用户，不接受客户端传入目标用户 ID。
- Access Token 为 HS256 JWT，校验 `sub`、`iss`、`aud`、`iat`、`exp`、`jti` 和 `tokenVersion`。
- Super Admin 接口在普通认证后继续实时校验 `isSuperAdmin`。
- 自有非 AI 业务接口统一使用 POST；查询条件、资源 ID 和更新字段放入 JSON Body。
- 旧版 GET、PUT、PATCH、DELETE 业务入口已移除；AI 会话接口与健康检查暂不纳入本轮迁移。
- 请求体使用严格 Schema；未知字段会返回 `VALIDATION_ERROR`。
- 所有响应包含 `traceId`，5xx 错误只向客户端返回安全信息。

## 2. 当前接口状态

### 已实现

| 方法 | 路径 | 认证 | 说明 |
| --- | --- | --- | --- |
| `POST` | `/api/register` | 否 | 注册普通用户 |
| `POST` | `/api/login/account` | 否 | 用户名或邮箱登录 |
| `POST` | `/api/password/forgot` | 否 | 请求密码重置；当前仅开发模式可交付 Token |
| `POST` | `/api/password/reset` | 否 | 使用一次性 Token 重置密码 |
| `POST` | `/api/currentUser/get` | Bearer | 获取当前用户及实时访问范围 |
| `POST` | `/api/users/me/update` | Bearer | 更新当前用户基本资料 |
| `POST` | `/api/users/me/default-organization/set` | Bearer | 更新当前用户默认组织 |
| `POST` | `/api/login/outLogin` | Bearer | 确认退出请求 |
| `POST` | `/api/admin/users/list` | Super Admin | 分页查询用户 |
| `POST` | `/api/admin/users/status/set` | Super Admin | 停用或恢复用户 |
| `POST` | `/api/admin/organizations/list` | Super Admin | 查询组织 |
| `POST` | `/api/admin/organizations/create` | Super Admin | 创建组织 |
| `POST` | `/api/admin/organizations/update` | Super Admin | 更新组织 |
| `POST` | `/api/admin/organizations/delete` | Super Admin | 删除未投入使用的组织 |

### 已注册但未实现

以下接口固定返回 HTTP `501` 和 `FEATURE_NOT_IMPLEMENTED`：

- `POST /api/admin/users/create`
- `POST /api/admin/users/update`
- `POST /api/admin/users/delete`

旧 GET/PUT/PATCH/DELETE 路由已移除，调用时返回 HTTP `404`。

### 尚未注册

以下能力属于后续目标，不应由前端当作可用接口调用：

- `GET /api/admin/users/:userId`
- 用户 Platform/Organization 授权快照与更新接口
- 权限、Skill、DataScope 目录接口

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
```/api/register``` response example:
```json lines
{
    "success": true,
    "data": {
        "userId": "eefa09a3-5080-485c-80e1-0f80d5b089f5",
        "username": "user3",
        "email": "user3@gmail.com",
        "name": "user3",
        "status": "active"
    },
    "traceId": "4333e986-5602-44c4-9dbe-89ce7600dd1f"
}
{
  "success": false,
  "errorCode": "ACCOUNT_ALREADY_EXISTS",
  "errorMessage": "用户名已存在",
  "traceId": "e9b1c394-b1e0-402a-bc61-0a7497424160",
  "details": {
    "field": "username"
  }
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
```api/login/account``` response example:
```json lines
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlblZlcnNpb24iOjEsInN1YiI6Ijc2ODAxNDRkLWQ4MjQtNDJkMi05ZWI3LTBlYTg4OTk1OTBmYSIsImlzcyI6ImFudC1kZXNpZ24tcHJvLWF1dGgtc2VydmVyIiwiYXVkIjoiYW50LWRlc2lnbi1wcm8td2ViIiwiaWF0IjoxNzg2MDY0OTQ0LCJleHAiOjE3ODYwNzIxNDQsImp0aSI6ImRmNTg1ZjAyLWY2MTUtNGZmMy05YjhhLWVlMGQxYjBlZTE2OCJ9.cE-td8wVWOuAs0Pp-gVsXIZAHWHEnNXGSuaacf-ByhA",
    "tokenType": "Bearer",
    "expiresIn": 7200,
    "expiresAt": "2026-08-07T03:09:04.000Z"
  },
  "traceId": "bbe7a98e-72a1-403b-83b4-658a695ca006"
}

{
  "success": false,
  "errorCode": "BAD_CREDENTIALS",
  "errorMessage": "用户名或密码错误",
  "traceId": "bc345512-0a24-48fa-b4ea-712027bb7dcd"
}
```

登录响应设置 `Cache-Control: no-store` 和 `Pragma: no-cache`。账号不存在、密码错误和账号非活动状态统一返回 `BAD_CREDENTIALS`，避免枚举账号。

### `POST /api/currentUser/get`

成功返回 `AuthCurrentUser`。Platform 与 Organization 授权均从数据库实时聚合：

- Platform Grant 来自 `scope_type = 'platform'` 且 `organization_id IS NULL`。
- Organization 只包含活动 Membership 和活动组织。
- Organization Grant 仅在对应 Membership 存在时有效。

```/api/currentUser``` response example:
```json
{
  "success": true,
  "data": {
  "userId": "7680144d-d824-42d2-9eb7-0ea8899590fa",
    "username": "sadmin",
    "name": "SAdmin",
    "avatar": null,
    "email": "sadmin@gmail.com",
    "status": "active",
    "isSuperAdmin": true,
    "platformPermissions": [
      "platform:audit:view",
      "platform:organization:create",
      "platform:organization:delete",
      "platform:organization:update",
      "platform:permission:grant",
      "platform:user:manage"
  ],
    "platformSkillCodes": [
      "ai-assistant",
      "document-summary",
      "file-review",
      "knowledge-search"
  ],
    "defaultOrganizationId": null,
    "organizations": [
    {
      "organizationId": "d8e58ad7-5a78-4c70-a488-d1e0cedc566f",
      "organizationCode": "ORG1",
      "organizationName": "ORG1",
      "permissions": [
        "organization:*"
      ],
      "skillCodes": [
        "document-summary",
        "file-review",
        "knowledge-search"
      ],
      "dataScopes": [],
      "defaultDataScopeId": null
    },
    {
      "organizationId": "f3ed11c9-af90-47fe-93fb-a8769a315442",
      "organizationCode": "ORG2",
      "organizationName": "ORG2",
      "permissions": [
        "organization:*"
      ],
      "skillCodes": [
        "ai-assistant",
        "document-summary",
        "file-review",
        "knowledge-search"
      ],
      "dataScopes": [],
      "defaultDataScopeId": null
    }
  ]
},
  "traceId": "c464fcb4-90f0-4b3a-aa8e-8bab754edc62"
}
```

### 计算登录落点
```json lines
拥有 Platform 权限
→ /workspace/platform/overview

否则有有效默认组织
→ /workspace/org/{defaultOrganizationId}/home

否则有其他可访问组织
→ /workspace/org/{第一个组织}/home

否则
→ /workspace/access-pending
```

### `POST /api/password/forgot`  TODO

请求为 `{ email: string }`，成功返回 HTTP `202`。开发模式返回一次性 `developmentResetToken`，有效期 15 分钟；无论邮箱是否存在都保持相同响应形态。

生产模式尚未配置邮件交付，明确返回 HTTP `503` 和 `PASSWORD_RESET_DELIVERY_UNAVAILABLE`，不得把开发 Token 暴露到生产环境。

### `POST /api/password/reset`TODO

请求为 `{ token: string; password: string }`。Token 长度为 32–512，新密码长度为 12–128。Token 在数据库中仅保存 SHA-256 摘要，成功使用后失效；更新密码时同时递增 `tokenVersion`，使旧 Access Token 失效。

### `POST /api/login/outLogin`

当前返回：

```json
{
  "loggedOut": true,
  "serverTokenRevoked": false
}
```
```/api/login/outLogin```example:
```json lines
{
    "success": true,
    "data": {
        "loggedOut": true,
        "serverTokenRevoked": false
    },
    "traceId": "689ebb27-583f-4f65-bb3d-3496e1e9289d"
}
```

当前 Access Token 为无状态 Token，退出主要由客户端删除本地 Token 完成；服务端撤销列表尚未实现。

## 6. 默认组织

### `POST /api/users/me/default-organization/set`

请求：

```json
{ "organizationId": "UUID" }
```

后端只允许保存当前用户可进入的活动组织。组织不存在、已停用、Membership 不存在或已停用时，统一返回 HTTP `403` 和 `ORGANIZATION_FORBIDDEN`，避免泄露组织目录。

成功返回 `{ "defaultOrganizationId": "UUID" }`。该接口只更新登录偏好，不修改 Membership、Grant 或 `tokenVersion`。


## 7. Super Admin 用户接口

### `POST /api/admin/users/list`

JSON 请求体：

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `page` | 是 | 1–1,000,000 的整数 |
| `pageSize` | 是 | 1–100 的整数 |
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
    organizations: Array<{
      organizationId: string;
      organizationCode: string;
      organizationName: string;
    }>;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  }>;
  page: number;
  pageSize: number;
  total: number;
}
```

### `POST /api/admin/users/organizations/set`

请求：`{ userId: string, organizationIds: string[] }`。该命令完整替换用户的有效 Organization Membership；移出组织时先删除对应 Grant，再删除 Membership，并使该用户现有 Access Token 失效。

### `POST /api/admin/users/status/set`

请求：`{ userId: string, status: 'active' | 'disabled' }`。状态变化会使目标用户现有 Access Token 失效；不能停用当前登录用户或最后一个有效 Super Admin。

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
```api/admin/organizations``` response example:
```json lines
{
    "success": true,
    "data": [
        {
            "organizationId": "d8e58ad7-5a78-4c70-a488-d1e0cedc566f",
            "organizationCode": "ORG1",
            "organizationName": "ORG1",
            "status": "active",
            "createdAt": "2026-07-22T16:20:56.701Z",
            "updatedAt": "2026-08-06T14:46:11.357Z"
        },
        {
            "organizationId": "f3ed11c9-af90-47fe-93fb-a8769a315442",
            "organizationCode": "ORG2",
            "organizationName": "ORG2",
            "status": "active",
            "createdAt": "2026-07-22T16:22:06.453Z",
            "updatedAt": "2026-07-22T16:22:06.453Z"
        }
    ],
    "traceId": "fe7e0a67-4fd2-4905-8e23-9dcce73dd47d"
}
```

- `POST /api/admin/organizations/list`：返回 `OrganizationSummary[]`。
- `POST /api/admin/organizations/create`：请求包含 `organizationCode`、`organizationName`、`status`，成功返回 HTTP `201`。编码为 2–64 个字符并转为大写。
- `POST /api/admin/organizations/update`：请求包含 `organizationId`，只允许更新 `organizationName` 和 `status`，且至少包含一个更新字段。
- `POST /api/admin/organizations/delete`：请求为 `{ organizationId }`，成功返回 `{ organizationId }`。

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

### Platform 权限
| 权限代码 | 含义 | - |
|------|----|---|
| `platform:organization:create`	| 创建组织 |
| `platform:organization:update`	| 修改组织 |
| `platform:organization:delete`	| 删除组织 |
| `platform:user:manage`	| 管理平台用户 |
| `platform:permission:grant`	| 管理平台权限 |

### org 权限
| 权限代码 | 含义 | - |
|------|----|---|
| `organization:user:manage`	| 显示“成员管理” |
| `organization:role:manage`	| 显示“角色管理” |
| `organization:permission:grant`	| 显示“角色管理” |
| `organization:settings:update`	| 显示“组织设置” |
- Platform Scope 管理跨组织的全局能力，Organization Scope 隔离并管理单个组织内的成员、权限、Skill 和业务数据。

Platform 与 Organization Skill：`ai-assistant`、`file-review`、`document-summary`、`knowledge-search`。

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
