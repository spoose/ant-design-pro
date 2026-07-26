# 后端认证、Workspace Scope 与权限 API 契约（Bearer Only）

> 状态：新需求基线，前后端实现以本文件为准
>
> 更新日期：2026-07-21
>
> 替代：旧 `System / Context / X-Context-Id` 工作区协议
>
> 字段约定：本文是 API JSON 字段、枚举、请求和响应的唯一事实来源；实施计划不得重新定义同名 DTO。

## 1. 已确认原则

- 认证只使用 access JWT，不使用 Cookie 和 refresh token。
- Platform 与 Organization 都是可切换的 `WorkspaceScope`，但属于不同授权域。
- 同一浏览器页面同一时刻只运行一个 Scope；不同 Organization 不能同时运行或同时显示标签。
- Platform 不属于普通 Organization，不使用 Organization 权限或请求 Header。
- Group、Department 等范围是 Organization 内的 `DataScope`，不是 WorkspaceScope、组织入口或标签。
- 后端直接返回 Organization 级有效权限；前端不得合并多个 DataScope 的权限。
- Platform App 使用 `platformSkillCodes`；Organization App 使用该组织的 `skillCodes`。
- Organization 业务请求携带 `X-Organization-Id`；Platform 请求不得继承最近访问的 Organization。
- 前端权限只控制可见性，后端必须依据 JWT、Scope 和实时权限再次鉴权。
- API JSON 统一使用 `camelCase`；MySQL 列名使用 `snake_case`，只在 Repository 映射。
- 用户主键在所有 API 中统一为 `userId`；旧字段 `userid` 不再出现在新接口。
- 所有成功响应统一使用 `ApiSuccess<T>`，所有失败响应统一使用 `ApiError`。
- ID 是不透明字符串，客户端不得从格式、长度或顺序推导业务含义。
- API 时间统一为 ISO 8601 UTC 字符串；MySQL 按 UTC 保存。
- 契约声明为 `null` 的空值必须明确返回 `null`；数组字段始终返回数组，不因无数据而省略。

MVP 暂不实现：

- Cookie 与 `GET /api/csrf`。
- `GET /api/login/captcha` 和手机验证码登录。
- 多个 Organization 在同一页面运行。
- DataScope 作为全局切换器或顶栏标签。
- 普通业务请求由前端提交权限码参与鉴权；唯一例外是 Super Admin 的用户授权快照接口。

## 2. 接口总表

| 方法 | 路径 | 认证 | 用途 |
| --- | --- | --- | --- |
| `POST` | `/api/register` | 否 | 创建账户，不签发 JWT |
| `POST` | `/api/login/account` | 否 | 账号密码登录并返回 access JWT |
| `POST` | `/api/password/forgot` | 否 | 请求一次性密码重置凭证 |
| `POST` | `/api/password/reset` | 否 | 使用一次性凭证设置新密码 |
| `GET` | `/api/currentUser` | Bearer JWT | 获取用户、Platform Access 和可进入的 Organization Access |
| `PUT` | `/api/users/me/default-organization` | Bearer JWT | 保存非 Platform 用户的长期默认组织 |
| `POST` | `/api/login/outLogin` | Bearer JWT | 可选的注销审计 |
| `GET/POST` | `/api/admin/users` | Bearer JWT + Super Admin | 查询或创建用户 |
| `GET/PATCH/DELETE` | `/api/admin/users/:userId` | Bearer JWT + Super Admin | 查询、更新或软删除用户 |
| `GET/PUT` | `/api/admin/users/:userId/access` | Bearer JWT + Super Admin | 查询或原子替换用户授权 |
| `GET` | `/api/admin/access-catalog` | Bearer JWT + Super Admin | 获取可授予 Permission 与 Skill |
| `GET/POST` | `/api/admin/organizations` | Bearer JWT + Super Admin | 查询或创建 Organization |
| `PATCH/DELETE` | `/api/admin/organizations/:organizationId` | Bearer JWT + Super Admin | 更新或删除空 Organization/仅含初始化访问的 Organization |
| 按业务定义 | Platform API | Bearer JWT | 使用 Platform 权限，不携带 Organization Header |
| 按业务定义 | Organization API | Bearer JWT + `X-Organization-Id` | 使用指定 Organization 的权限和数据范围 |

`/api/currentUser.organizations` 只表示用户可以进入的组织，不能替代 Super Admin 的平台组织目录。Super Admin 修改用户授权时使用 `/api/admin/organizations`。

项目中已有但 MVP 不使用的认证接口：

| 方法 | 路径 | 当前来源 | MVP 处理 |
| --- | --- | --- | --- |
| `GET` | `/api/login/captcha` | 原手机号登录表单 | 本期不调用、不要求后端实现；不是永久删除验证码登录能力 |
| `GET` | `/api/csrf` | Cookie 会话方案 | Bearer-only MVP 不调用、不要求后端实现 |

## 3. 通用响应

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
  details?: Record<string, unknown>;
  traceId: string;
};

type PageResult<T> = {
  list: T[];
  page: number;
  pageSize: number;
  total: number;
};
```

- 所有成功接口都返回 `ApiSuccess<T>`；登录接口不再使用特殊的顶层响应结构。
- `400/401/403/404/409/500/503` 必须使用对应 HTTP 状态，不能返回 `HTTP 200 + success: false`。
- `traceId` 用于链路排查，不包含 JWT、密码或权限敏感数据。
- 后端错误信息可以展示，但不能泄露用户无权访问的组织是否存在。
- `details` 只包含安全的字段校验信息；SQL、堆栈和内部路径只记录在服务端。

## 4. 核心访问结构

```ts
type AuthCurrentUser = {
  userId: string;
  username: string;
  name: string;
  avatar: string | null;
  email: string;
  status: UserStatus;
  isSuperAdmin: boolean;

  // Platform 控制面权限；不能由 Organization 权限合并得到。
  platformPermissions: string[];
  // Platform Scope 内可打开的 App/Skill 白名单。
  platformSkillCodes: string[];

  // 非 Platform 用户登录后的长期默认组织。
  defaultOrganizationId: string | null;
  // 当前用户可以真正“进入”的组织，不代表 Platform 可管理组织全集。
  organizations: OrganizationAccess[];
};

type UserStatus = 'active' | 'disabled' | 'deleted';

type OrganizationAccess = {
  organizationId: string;
  organizationCode: string;
  organizationName: string;

  // 后端计算后的组织级有效权限，前端不得从 DataScope 聚合生成。
  permissions: string[];
  // 后端按用户和组织过滤后的 App/Skill 白名单。
  skillCodes: string[];

  // 用户在组织内可以使用的数据范围。
  dataScopes: DataScope[];
  defaultDataScopeId: string | null;
};

type DataScope = {
  dataScopeId: string;
  dataScopeCode: string;
  dataScopeName: string;
  type: 'organization' | 'department' | 'team' | 'project' | 'custom';
};
```

关系：

```text
AuthCurrentUser
├── platformPermissions[]
├── platformSkillCodes[]
├── defaultOrganizationId
└── organizations[]
    ├── permissions[]
    ├── skillCodes[]
    └── dataScopes[]
```

规则：

- `organizationId` 是 URL、Storage Scope Key 和 `X-Organization-Id` 的唯一组织标识。
- 没有有效默认组织时，`defaultOrganizationId` 明确返回 `null`，不省略字段。
- 没有默认 DataScope 时，`defaultDataScopeId` 明确返回 `null`；数组字段始终返回数组。
- `dataScopeId` 只能用于组织内部的数据过滤，不得替代 `organizationId`。
- `permissions` 与 `skillCodes` 是并列的派生结果，不互相推导。
- Role 可用于后台配置、展示和审计，但前后端不能只根据 `role === 'admin'` 放行。
- `platformPermissions` 和 Organization `permissions` 使用不同命名空间。

权限码示例：

```text
platform:organization:create
platform:organization:update
platform:organization:delete
platform:user:manage
platform:permission:grant
platform:audit:view

organization:settings:update
organization:user:manage
organization:role:manage
organization:permission:grant
app:file-review:use
```

## 5. 注册与登录

### `POST /api/register`

MVP 复用项目已有的 `/api/register`。注册成功只创建账户，不自动登录，也不返回 access token；用户随后通过 `/api/login/account` 登录。

请求：

```http
POST /api/register
Content-Type: application/json
```

```json
{
  "username": "user1",
  "email": "user1@example.com",
  "name": "用户一",
  "password": "example-password"
}
```

```ts
type RegisterRequest = {
  username: string;
  email: string;
  name: string;
  password: string;
};

type RegisterData = {
  userId: string;
  username: string;
  email: string;
  name: string;
  status: 'active';
};
```

响应：

```json
{
  "success": true,
  "data": {
    "userId": "user1",
    "username": "user1",
    "email": "user1@example.com",
    "name": "用户一",
    "status": "active"
  },
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `username` | `string` | 是 | 登录用户名，全局唯一 |
| `password` | `string` | 是 | 明文仅通过 HTTPS 传输，后端使用强密码哈希保存 |
| `email` | `string` | 是 | 登录邮箱，全局唯一；校验格式并规范化保存，暂不验证归属 |
| `name` | `string` | 是 | 用户展示名称；后端不从用户名静默推导 |
| `userId` | `string` | 是 | 新用户唯一 ID |
| `status` | `"active"` | 是 | 注册后的初始用户状态 |

前端可以保留 `confirm` 字段校验两次密码一致，但不发送给后端。后端必须独立校验用户名、邮箱、展示名称和密码强度。MVP 不发送手机或邮箱验证码，也不包含邮箱激活流程。

### `POST /api/login/account`

请求：

```http
POST /api/login/account
Content-Type: application/json
```

```json
{
  "account": "user1",
  "password": "ant.design"
}
```

```ts
type LoginRequest = {
  // 可以是 username 或 email。
  account: string;
  password: string;
};

type LoginData = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: string;
};
```

成功响应头：

```http
Cache-Control: no-store
Pragma: no-cache
```

响应：

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 7200,
    "expiresAt": "2026-07-21T10:00:00Z"
  },
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `account` | `string` | 是 | 用户名或邮箱 |
| `accessToken` | `string` | 是 | JWT access token |
| `tokenType` | `"Bearer"` | 是 | 固定为 `Bearer` |
| `expiresIn` | `number` | 是 | 剩余有效秒数 |
| `expiresAt` | `string` | 是 | 过期时间，ISO 8601 UTC |

access token 保存到 `localStorage`，后续通过 `Authorization: Bearer <jwt>` 发送。JWT 过期后端返回 `401`，前端清理 token 并重新登录。旧字段 `username`、`type`、`autoLogin`、`status` 和 `currentAuthority` 不进入新后端契约；前端一次性迁移，不做双字段 Fallback。

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

### `POST /api/password/forgot`

请求字段固定为注册邮箱：

```ts
type ForgotPasswordRequest = {
  email: string;
};
```

开发环境响应：

```ts
type ForgotPasswordData = {
  accepted: true;
  expiresAt: string;
  developmentResetToken: string;
};
```

- 不论邮箱是否存在，请求阶段都返回相同结构，避免直接枚举账户。
- 原始 Token 只返回一次；MySQL 只保存 SHA-256 Hash。
- Token 15 分钟过期，新请求会使同一用户之前未使用的 Token 失效。
- `developmentResetToken` 仅用于本机开发闭环；生产环境未配置邮件投递时返回 `503 PASSWORD_RESET_DELIVERY_UNAVAILABLE`，不能伪装成已发送。

### `POST /api/password/reset`

```ts
type ResetPasswordRequest = {
  token: string;
  password: string;
};
```

成功响应的 `data` 为 `{ reset: true }`。成功后 Token 标记为已使用，用户 `tokenVersion` 递增，旧 JWT 在下一次请求时失效。无效、已使用或过期 Token 统一返回 `400 PASSWORD_RESET_TOKEN_INVALID`。

## 6. 获取用户与访问范围

### `GET /api/currentUser`

```http
GET /api/currentUser
Authorization: Bearer <jwt>
```

示例响应：

```json
{
  "success": true,
  "data": {
    "userId": "user1",
    "username": "user1",
    "name": "用户一",
    "avatar": null,
    "email": "user1@example.com",
    "status": "active",
    "isSuperAdmin": false,
    "platformPermissions": [],
    "platformSkillCodes": [],
    "defaultOrganizationId": "org-1",
    "organizations": [
      {
        "organizationId": "org-1",
        "organizationCode": "ORG1",
        "organizationName": "组织一",
        "permissions": [
          "organization:user:manage",
          "organization:role:manage",
          "app:file-review:use"
        ],
        "skillCodes": ["file-review", "knowledge-search"],
        "defaultDataScopeId": "department-east",
        "dataScopes": [
          {
            "dataScopeId": "department-east",
            "dataScopeCode": "EAST",
            "dataScopeName": "华东部门",
            "type": "department"
          }
        ]
      }
    ]
  },
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

Super Admin 示例差异：

```json
{
  "isSuperAdmin": true,
  "platformPermissions": [
    "platform:organization:create",
    "platform:organization:update",
    "platform:user:manage",
    "platform:permission:grant",
    "platform:audit:view"
  ],
  "platformSkillCodes": [
    "platform-assistant",
    "file-review",
    "document-summary",
    "knowledge-search"
  ],
  "organizations": []
}
```

Super Admin 即使可以管理全部组织，也不要求 `organizations` 返回所有组织。只有明确允许“进入组织业务工作区”的组织才进入该数组。Super Admin 创建 Organization 时会成为该组织的成员并获得 `organization:*` 与全部 Organization Skill；新建组织因此会进入该创建者的数组。

## 7. Platform 与 Organization Access

### Platform Access

- 任一有效 `platform:*` 权限允许进入受限管理中心。
- Platform Sidebar、页面和操作只从 `platformPermissions` 计算。
- Platform App 只从 `platformSkillCodes` 生成入口。
- Platform API 不读取、继承或组合任何 Organization 权限。
- Platform API 请求不得携带 `X-Organization-Id`。

### Organization Access

- Organization 必须存在于 `currentUser.organizations`，前端才允许生成入口。
- Organization Sidebar、页面、按钮和 App 只读取该 OrganizationAccess。
- 同一用户可在不同 Organization 拥有不同权限和 Skill。
- 后端必须根据 JWT 和 `X-Organization-Id` 查询实时权限，不能信任前端缓存。

### 权限与 Skill 更新

- 登录、整页刷新和 Organization 切换都会重新请求 `/api/currentUser`。
- 权限发生变化时，可以显式重新请求 `/api/currentUser` 更新界面。
- 已失去 Organization 或 Skill 权限时，前端移除相应入口和恢复记录；后端同时返回 `403`。

## 8. 默认组织与登录落点

### `PUT /api/users/me/default-organization`

```http
PUT /api/users/me/default-organization
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{
  "organizationId": "org-1"
}
```

```json
{
  "success": true,
  "data": {
    "defaultOrganizationId": "org-1"
  },
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

后端必须验证该 Organization 位于当前用户可进入的 `organizations` 中。

登录落点优先级：

1. 拥有 Platform Access：进入 `/workspace/platform/overview`。
2. 没有 Platform Access，但 `defaultOrganizationId` 仍有效：进入该 Organization 首页。
3. 只有一个可进入 Organization：直接进入该 Organization 首页。
4. 多个 Organization 且没有有效默认值：进入组织选择页。
5. 没有 Platform Access 且没有 Organization：进入无授权状态。

右上角临时切换 WorkspaceScope 不修改 `defaultOrganizationId`。只有用户在默认组织设置或首次选择流程中明确确认时才调用本接口。

## 9. Super Admin 用户与授权 API

所有 `/api/admin/*` 接口必须同时验证 Bearer JWT、用户状态、`tokenVersion` 和数据库中的 `isSuperAdmin`。普通 Platform Permission 不能替代 Super Admin 身份。

### 9.1 统一用户结构

```ts
type AdminUser = {
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
};

type CreateUserRequest = {
  username: string;
  email: string;
  name: string;
  password: string;
  status: 'active' | 'disabled';
};

type UpdateUserRequest = {
  username?: string;
  email?: string;
  name?: string;
  status?: 'active' | 'disabled';
};
```

规则：

- `RegisterRequest` 与 `CreateUserRequest` 共享 `username/email/name/password` 的字段名和校验规则。
- 管理员创建用户额外要求明确提交 `status`，不依赖后端隐式默认值。
- `UpdateUserRequest` 至少包含一个字段，未知字段返回 `VALIDATION_ERROR`。
- `isSuperAdmin`、`userId`、时间字段和 `defaultOrganizationId` 不能通过普通用户更新接口修改。
- `DELETE` 执行软删除；恢复使用 `PATCH status=active`，但仍受 Super Admin 保护规则约束。

### 9.2 用户 CRUD

当前只实现分页只读列表。`POST /api/admin/users`、`PATCH /api/admin/users/:userId` 和
`DELETE /api/admin/users/:userId` 已预留，调用时返回 `501 FEATURE_NOT_IMPLEMENTED`，不产生数据写入。
其余表格中的接口仍是目标契约，不代表当前已经开放。

| 方法 | 路径 | 请求 | 成功响应 `data` |
| --- | --- | --- | --- |
| `GET` | `/api/admin/users` | `UserListQuery` | `PageResult<AdminUser>` |
| `POST` | `/api/admin/users` | `CreateUserRequest` | `AdminUser` |
| `GET` | `/api/admin/users/:userId` | 无 | `AdminUser` |
| `PATCH` | `/api/admin/users/:userId` | `UpdateUserRequest` | `AdminUser` |
| `DELETE` | `/api/admin/users/:userId` | 无 | `{ userId: string; status: 'deleted' }` |

```ts
type UserListQuery = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: UserStatus;
  sortBy?: 'username' | 'email' | 'name' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};
```

- `page` 和 `pageSize` 必填，避免客户端与服务端使用不同的隐式分页值。
- `sortBy` 只允许白名单值；非法值返回 400，不拼接到 SQL。
- `keyword` 由后端定义对 `username/email/name` 的安全匹配。
- 禁止删除或停用当前 Super Admin 自己，也禁止删除或停用最后一个有效 Super Admin。

### 9.3 用户授权快照

```ts
type OrganizationAccessAssignment = {
  organizationId: string;
  permissions: string[];
  skillCodes: string[];
};

type UserAccessSnapshot = {
  platformPermissions: string[];
  platformSkillCodes: string[];
  organizations: OrganizationAccessAssignment[];
};
```

| 方法 | 路径 | 请求 | 成功响应 `data` |
| --- | --- | --- | --- |
| `GET` | `/api/admin/users/:userId/access` | 无 | `UserAccessSnapshot` |
| `PUT` | `/api/admin/users/:userId/access` | `UserAccessSnapshot` | `UserAccessSnapshot` |

`PUT` 是完整快照替换：

1. 先校验所有 Organization、Permission 和 Skill Code。
2. 对数组去重；重复值返回 400，不静默去重。
3. 任一值无效时整笔请求失败。
4. 验证成功后，在一个 MySQL 事务中替换 Membership 与 Grant。
5. 返回数据库重新读取的最终快照，不直接回显请求体。
6. 撤销关键访问时递增目标用户 `tokenVersion`。

`OrganizationAccessAssignment` 是管理写模型；`OrganizationAccess` 是 `/api/currentUser` 的读模型。后者额外包含组织编码、名称与 DataScope，不能把两个类型混用。

### 9.4 授权目录与组织目录

```ts
type AccessCatalogItem = {
  code: string;
  name: string;
  description: string;
};

type AccessCatalog = {
  platformPermissions: AccessCatalogItem[];
  organizationPermissions: AccessCatalogItem[];
  platformSkills: AccessCatalogItem[];
  organizationSkills: AccessCatalogItem[];
};

type OrganizationSummary = {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
};

type CreateOrganizationRequest = {
  organizationCode: string;
  organizationName: string;
  status: 'active' | 'disabled';
};

type UpdateOrganizationRequest = {
  organizationName?: string;
  status?: 'active' | 'disabled';
};
```

| 方法 | 路径 | 成功响应 `data` |
| --- | --- | --- |
| `GET` | `/api/admin/access-catalog` | `AccessCatalog` |
| `GET` | `/api/admin/organizations` | `OrganizationSummary[]` |
| `POST` | `/api/admin/organizations` | `OrganizationSummary` |
| `PATCH` | `/api/admin/organizations/:organizationId` | `OrganizationSummary` |
| `DELETE` | `/api/admin/organizations/:organizationId` | `{ organizationId: string }` |

- Access Catalog 来自后端 Allowlist，不从现有用户授权反推。
- 未知 Code 返回 `UNKNOWN_PERMISSION` 或 `UNKNOWN_SKILL`。
- 只有 `active` Organization 可以加入新的用户授权快照。
- Organization Code 创建时统一转为大写，创建后不可修改。
- POST 原子写入 Organization、创建者 Membership、`organization:*` 和全部 Organization Skill Grant。
- DELETE 允许删除空 Organization，也允许原子清理并删除只含创建者完整初始化访问的 Organization；存在其他成员、额外 Grant 或不完整初始化访问时返回 `409 ORGANIZATION_IN_USE`。

## 10. WorkspaceScope 与 URL

最终 URL：

```text
/workspace/platform/overview
/workspace/platform/organizations
/workspace/platform/apps/:appKey

/workspace/org/:organizationId/home
/workspace/org/:organizationId/members
/workspace/org/:organizationId/roles
/workspace/org/:organizationId/settings
/workspace/org/:organizationId/apps/:appKey/*
```

切换规则：

- Platform 与 Organization 使用同一个 Workspace 切换器。
- 切换 Scope 使用整页导航，重新加载用户与权限。
- Platform、不同 Organization 的组件、请求和标签不能同时运行。
- Platform 与每个 Organization 可以拥有各自隔离的标签恢复快照，但任意时刻只读取当前 Scope 的快照。
- URL 是当前 Scope、当前标签和 Sidebar 的唯一导航依据，不持久化独立 `sidebarState`。

## 11. 业务请求

### Super Admin Platform 请求

```http
GET /api/admin/organizations
Authorization: Bearer <jwt>
```

后端校验：JWT → 用户实时状态与 `tokenVersion` → `isSuperAdmin` → 具体操作约束。

### Organization 请求

```http
GET /api/files?dataScopeId=department-east
Authorization: Bearer <jwt>
X-Organization-Id: org-1
```

后端依次校验：

1. JWT 签名、`exp`、`iss` 和 `aud`。
2. 从 JWT `sub` 获取用户 ID。
3. 用户是否可以进入 `X-Organization-Id` 指定的 Organization。
4. 后端数据库或可信缓存中的 Organization 实时权限。
5. 业务操作所需权限。
6. 请求中的 `dataScopeId` 是否属于该用户在当前 Organization 的可用 DataScope。

前端不发送权限码。`skillCode` 也不能作为后端放行依据。

### DataScope 传递规则

- DataScope 不是全局 WorkspaceScope，不使用全局切换器。
- 列表和查询接口通过查询参数传递 `dataScopeId`。
- 创建、更新、任务启动等命令通过路径参数或请求体传递 `dataScopeId`。
- 不使用全局 `X-Data-Scope-Id`，避免不同 App 或并发请求误用同一 DataScope。
- 接口不需要 DataScope 时不传；需要但缺少时返回 `DATA_SCOPE_REQUIRED`。

## 12. 标签恢复边界

标签快照按以下 Key 隔离：

```text
workspace-tabs:{version}:{userId}:platform
workspace-tabs:{version}:{userId}:organization:{organizationId}
```

只保存：

- 固定首页和已打开 App 标签。
- App Key、标题、最后 URL 和顺序。

不保存：

- React 组件实例、接口数据和 React Query 全部缓存。
- Token、权限数组或 DataScope 授权结果。
- 表单值、上传文件或敏感草稿。

恢复时以最新 `/api/currentUser` 为准，删除已撤权 Organization 或 App 的记录。

## 13. 注销

Bearer-only MVP 的注销由前端清除本地 access token 完成：

```ts
localStorage.removeItem('ant-design-pro.access-token');
```

### `POST /api/login/outLogin`

前端在删除 token 前调用经过认证的退出确认接口：

```http
POST /api/login/outLogin
Authorization: Bearer <jwt>
```

```json
{
  "success": true,
  "data": {
    "loggedOut": true,
    "serverTokenRevoked": false
  },
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

当前 `serverTokenRevoked: false` 明确表示后端只确认退出请求，前端仍负责在 `finally` 中删除本地 token。
纯无状态 JWT 无法立即撤销已签发 token；后续接入 Redis `jti` 黑名单后，撤销成功时改为返回
`serverTokenRevoked: true`。用户 `tokenVersion` 继续用于密码重置、封禁和全部设备下线。

## 14. 错误码

| HTTP | `errorCode` | 含义 |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | 请求字段不合法 |
| `400` | `ORGANIZATION_REQUIRED` | Organization API 缺少 `X-Organization-Id` |
| `400` | `DATA_SCOPE_REQUIRED` | 当前接口要求 DataScope，但请求未提供 |
| `400` | `UNKNOWN_PERMISSION` | 请求包含未定义 Permission Code |
| `400` | `UNKNOWN_SKILL` | 请求包含未定义 Skill Code |
| `400` | `PASSWORD_RESET_TOKEN_INVALID` | 密码重置 Token 无效、已使用或已过期 |
| `409` | `ACCOUNT_ALREADY_EXISTS` | 用户名或邮箱已存在 |
| `409` | `LAST_SUPER_ADMIN` | 操作会移除最后一个有效 Super Admin |
| `409` | `SUPER_ADMIN_ALREADY_EXISTS` | 受控 Seed 检测到已有 Super Admin |
| `409` | `SUPER_ADMIN_SEED_BUSY` | 另一个 Super Admin Seed 正在执行 |
| `409` | `CANNOT_MODIFY_SELF` | Super Admin 尝试删除或停用自己 |
| `401` | `BAD_CREDENTIALS` | 用户名或密码错误 |
| `401` | `ACCESS_TOKEN_MISSING` | 未携带 Bearer token |
| `401` | `ACCESS_TOKEN_INVALID` | JWT 签名或 Claims 无效 |
| `401` | `ACCESS_TOKEN_EXPIRED` | JWT 已过期 |
| `403` | `PLATFORM_PERMISSION_DENIED` | 缺少 Platform 操作权限 |
| `403` | `ORGANIZATION_FORBIDDEN` | 用户不能进入指定 Organization |
| `403` | `DATA_SCOPE_FORBIDDEN` | DataScope 不属于当前用户和 Organization |
| `403` | `PERMISSION_DENIED` | 当前 Scope 缺少具体操作权限 |
| `403` | `SUPER_ADMIN_REQUIRED` | 当前接口只允许 Super Admin |
| `404` | `USER_NOT_FOUND` | 目标用户不存在 |
| `404` | `ORGANIZATION_NOT_FOUND` | 目标 Organization 不存在 |
| `500` | `INTERNAL_ERROR` | 后端异常 |
| `501` | `FEATURE_NOT_IMPLEMENTED` | 接口路径已预留，但当前版本尚未实现该能力 |
| `503` | `DATABASE_UNAVAILABLE` | MySQL 不可用或依赖尚未就绪 |
| `503` | `PASSWORD_RESET_DELIVERY_UNAVAILABLE` | 生产环境尚未配置密码重置邮件投递 |

## 15. 后端配置与安全要求

- Node.js + Express 后端保持无状态，不创建服务端 Session。
- MySQL 使用连接池、参数化查询和显式事务。
- 从 `Authorization` Header 提取 Bearer JWT。
- CORS 仅允许受信任前端域名，不使用 `*`。
- CORS 允许 `Content-Type`、`Authorization` 和 `X-Organization-Id`。
- CORS Methods 允许实际需要的 `GET`、`POST`、`PUT`、`PATCH`、`DELETE` 和 `OPTIONS`。
- `OPTIONS` 预检请求不要求登录。
- Platform API 不能因为携带某个 Organization ID 而获得或扩大权限。
- Organization API 必须校验用户、Organization、DataScope 与权限的完整关系。
- JWT、密码和权限敏感数据不得进入日志或错误信息。
- 密码重置原始 Token 不得写入日志或 MySQL；生产环境只能通过受控邮件投递。
- Bearer Header 不会被浏览器自动携带，MVP 不需要 CSRF Token。
- 建议配置严格 CSP，降低 localStorage token 被 XSS 窃取的风险。
- 环境变量、JWT Secret 或私钥、数据库凭据缺失时启动失败，不回退默认配置。
- 数据库、权限或用户查询失败时返回标准错误，不回退 Mock、静态数组、默认管理员或空权限。

## 16. 字段映射与旧协议迁移

### 16.1 MySQL 与 API 字段映射

| MySQL | API JSON |
| --- | --- |
| `id` / `user_id` | `userId` |
| `display_name` | `name` |
| `avatar_url` | `avatar` |
| `is_super_admin` | `isSuperAdmin` |
| `default_organization_id` | `defaultOrganizationId` |
| `token_version` | 仅 JWT 校验使用，不在普通用户 DTO 暴露 |
| `organization_id` | `organizationId` |
| `organization_code` / `code` | `organizationCode` |
| `organization_name` / `name` | `organizationName` |
| `skill_code` | `skillCodes[]` 中的元素 |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |
| `deleted_at` | `deletedAt` |

Repository 是唯一允许执行 snake_case/camelCase 映射的层。Route、Service、OpenAPI 和前端统一使用 API JSON 字段。

### 16.2 前端旧字段迁移

| 旧字段 | 统一字段/处理 |
| --- | --- |
| `userid` | `userId` |
| 登录请求 `username` | `account`，可接受用户名或邮箱值 |
| 登录请求 `type`、`autoLogin` | 删除，不发送到后端 |
| 登录响应 `status`、`type`、`currentAuthority` | 删除；成功由 `success: true` 表达，权限来自 `/api/currentUser` |
| `access` | 删除；使用 `isSuperAdmin`、`platformPermissions` 与 Organization `permissions` |
| 注册响应 `status: "ok"` | `status: "active"`，使用统一 `UserStatus` |

不同时返回新旧字段，也不在前端用 `newField ?? oldField` 长期兼容。OpenAPI 和调用方在同一变更中完成迁移。

### 16.3 Workspace 旧协议迁移

| 旧字段/行为 | 新字段/行为 |
| --- | --- |
| `contexts[]` | `organizations[]` |
| `AccessContext` | `OrganizationAccess` + `DataScope[]` |
| `systemId` | `organizationId` |
| `systemCode` | `organizationCode` |
| `systemName` | `organizationName` |
| `defaultContextId` | `defaultOrganizationId` |
| `X-Context-Id` | `X-Organization-Id` |
| `sessionStorage.currentContextId` | URL 中的 `organizationId` |
| System/Context 切换不刷新 | WorkspaceScope 切换执行整页导航 |
| 多 System 标签同时存在 | 仅当前 Scope 的 Home/App 标签运行 |

新后端不提供旧 Context 字段兼容响应。OpenAPI、前端调用方和后端在同一功能分支内一次性迁移，旧字段不得继续进入 Workspace、标签、Sidebar 和权限核心模型。
