# 后端认证、Workspace Scope 与权限 API 契约（Bearer Only）

> 状态：人工说明基线；唯一机器契约为 `openapi/jushu-api.json`
>
> 更新日期：2026-07-26
>
> 替代：旧 `System / Context / X-Context-Id` 工作区协议

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

MVP 暂不实现：

- Cookie 与 `GET /api/csrf`。
- `GET /api/login/captcha` 和手机验证码登录。
- 多个 Organization 在同一页面运行。
- DataScope 作为全局切换器或顶栏标签。
- 前端提交权限码参与鉴权。

## 2. 接口总表

| 方法 | 路径 | 认证 | 用途 |
| --- | --- | --- | --- |
| `POST` | `/api/register` | 否 | 创建账户，不签发 JWT |
| `POST` | `/api/login/account` | 否 | 账号密码登录并返回 access JWT |
| `GET` | `/api/currentUser` | Bearer JWT | 获取用户、Platform Access 和可进入的 Organization Access |
| `PUT` | `/api/users/me/default-organization` | Bearer JWT | 保存非 Platform 用户的长期默认组织 |
| `GET` | `/api/platform/organizations` | Bearer JWT + Platform 权限 | 获取 Super Admin 可管理的组织目录 |
| `POST` | `/api/login/outLogin` | Bearer JWT | 可选的注销审计 |
| 按业务定义 | Platform API | Bearer JWT | 使用 Platform 权限，不携带 Organization Header |
| 按业务定义 | Organization API | Bearer JWT + `X-Organization-Id` | 使用指定 Organization 的权限和数据范围 |

`/api/currentUser.organizations` 只表示用户可以进入的组织，不能替代 Super Admin 的平台组织目录。Super Admin 管理全部组织时使用 `/api/platform/organizations`。

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
```

- `401/403` 必须使用对应 HTTP 状态，不能返回 `HTTP 200 + success: false`。
- `errorCode` 固定为稳定字符串，不使用 HTTP 状态数字代替业务错误码。
- `traceId` 用于链路排查，不包含 JWT、密码或权限敏感数据。
- 后端错误信息可以展示，但不能泄露用户无权访问的组织是否存在。

## 4. 核心访问结构

```ts
type AuthCurrentUser = {
  userId: string;
  username: string;
  name: string;
  avatar: string | null;
  email: string;
  status: 'active' | 'disabled' | 'deleted';
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
- API JSON 使用 camelCase；数据库列继续使用 snake_case，由 Repository 映射。
- 响应对象保持稳定字段形状：字段存在但无值时返回 `null`，不省略字段。
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

type RegisteredUser = {
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
| `email` | `string` | 是 | 登录邮箱，全局唯一；校验格式、规范化并保存，暂不验证归属 |
| `name` | `string` | 是 | 用户展示名称 |
| `password` | `string` | 是 | 明文仅通过 HTTPS 传输，后端使用强密码哈希保存 |
| `userId` | `string` | 是 | 新用户唯一 ID |
| `status` | `"active"` | 是 | 新用户的账号状态 |

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
  account: string;
  password: string;
};

type AuthLoginData = {
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
    "expiresAt": "2026-07-26T10:00:00Z"
  },
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `account` | `string` | 是 | 用户名或邮箱，后端统一规范化后查询 |
| `password` | `string` | 是 | 用户输入的登录密码 |
| `accessToken` | `string` | 是 | JWT access token |
| `tokenType` | `"Bearer"` | 是 | 固定为 `Bearer` |
| `expiresIn` | `number` | 是 | 剩余有效秒数 |
| `expiresAt` | `string` | 是 | UTC RFC 3339 过期时间 |

access token 保存到 `localStorage`，后续通过 `Authorization: Bearer <jwt>` 发送。JWT 过期后端返回 `401`，前端清理 token 并重新登录。旧字段 `username`、`type`、`autoLogin` 和 `currentAuthority` 不再进入产品 API。

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
  "platformPermissions": [
    "platform:organization:create",
    "platform:organization:update",
    "platform:user:manage",
    "platform:permission:grant",
    "platform:audit:view"
  ],
  "platformSkillCodes": ["platform-assistant"],
  "organizations": []
}
```

Super Admin 即使可以管理全部组织，也不要求 `organizations` 返回所有组织。只有明确允许“进入组织业务工作区”的组织才进入该数组。

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

## 9. WorkspaceScope 与 URL

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


> workspace是将新业务壳与 /user、/dashboard 等 Ant Design Pro 模板路由隔离，后期删除模版代码后移除

切换规则：

- Platform 与 Organization 使用同一个 Workspace 切换器。
- 切换 Scope 使用整页导航，重新加载用户与权限。
- Platform、不同 Organization 的组件、请求和标签不能同时运行。
- Platform 与每个 Organization 可以拥有各自隔离的标签恢复快照，但任意时刻只读取当前 Scope 的快照。
- URL 是当前 Scope、当前标签和 Sidebar 的唯一导航依据，不持久化独立 `sidebarState`。

## 10. 业务请求

### Platform 请求

```http
GET /api/platform/organizations
Authorization: Bearer <jwt>
```

后端校验：JWT → Platform 实时权限 → 具体操作权限。

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

## 11. 标签恢复边界

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

## 12. 注销

Bearer-only MVP 的注销由前端清除本地 access token 完成：

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

## 13. 错误码

| HTTP | `errorCode` | 含义 |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | 请求字段不合法 |
| `400` | `ORGANIZATION_REQUIRED` | Organization API 缺少 `X-Organization-Id` |
| `400` | `DATA_SCOPE_REQUIRED` | 当前接口要求 DataScope，但请求未提供 |
| `409` | `ACCOUNT_ALREADY_EXISTS` | 用户名或邮箱已存在 |
| `401` | `BAD_CREDENTIALS` | 用户名或密码错误 |
| `401` | `ACCESS_TOKEN_MISSING` | 未携带 Bearer token |
| `401` | `ACCESS_TOKEN_INVALID` | JWT 签名或 Claims 无效 |
| `401` | `ACCESS_TOKEN_EXPIRED` | JWT 已过期 |
| `403` | `PLATFORM_PERMISSION_DENIED` | 缺少 Platform 操作权限 |
| `403` | `ORGANIZATION_FORBIDDEN` | 用户不能进入指定 Organization |
| `403` | `DATA_SCOPE_FORBIDDEN` | DataScope 不属于当前用户和 Organization |
| `403` | `PERMISSION_DENIED` | 当前 Scope 缺少具体操作权限 |
| `500` | `INTERNAL_ERROR` | 后端异常 |

## 14. 后端配置与安全要求

- Express 使用无状态认证中间件执行 JWT 鉴权。
- 从 `Authorization: Bearer <token>` Header 提取并验证 JWT。
- CORS 仅允许受信任前端域名，不使用 `*`。
- CORS 允许 `Content-Type`、`Authorization` 和 `X-Organization-Id`。
- `OPTIONS` 预检请求不要求登录。
- Platform API 不能因为携带某个 Organization ID 而获得或扩大权限。
- Organization API 必须校验用户、Organization、DataScope 与权限的完整关系。
- JWT、密码和权限敏感数据不得进入日志或错误信息。
- Bearer Header 不会被浏览器自动携带，MVP 不需要 CSRF Token。
- 建议配置严格 CSP，降低 localStorage token 被 XSS 窃取的风险。

## 15. 旧协议迁移

| 旧字段/行为 | 新字段/行为 |
| --- | --- |
| `contexts[]` | `organizations[]` |
| `AccessContext` | `OrganizationAccess` + `DataScope[]` |
| `systemId` | `organizationId` |
| `systemCode` | `organizationCode` |
| `systemName` | `organizationName` |
| `defaultContextId` | `defaultOrganizationId` |
| `userid` | `userId` |
| `X-Context-Id` | `X-Organization-Id` |
| `sessionStorage.currentContextId` | URL 中的 `organizationId` |
| System/Context 切换不刷新 | WorkspaceScope 切换执行整页导航 |
| 多 System 标签同时存在 | 仅当前 Scope 的 Home/App 标签运行 |

迁移期间可以在 API Adapter 层兼容旧响应，但旧 Context 字段不得继续进入 Workspace、标签、Sidebar 和权限核心模型。
