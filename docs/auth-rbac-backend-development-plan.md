# 认证、用户管理与权限后端 MVP 计划

> 状态：实施基线
> 目标分支：`codex/auth-backend-rbac`
> 基线分支：`auth-rbac@5c8bb75c`
> 更新日期：2026-07-22
> 关联契约：[后端认证、Workspace Scope 与权限 API 契约](./backend-auth-api-bearer-only.md)

字段规则：关联契约是 API JSON、DTO、枚举、错误码和响应包络的唯一事实来源。本计划只描述架构、数据库、实施阶段和验收，不允许为同一接口定义另一套字段。

## 1. 已确认目标

本阶段只完成一个可验证的最小闭环：

1. 用户可以通过用户名、邮箱、展示名称和密码完成注册。
2. 用户可以通过账号密码登录并恢复登录态。
3. 系统提供一个预置 Super Admin。
4. Super Admin 可以创建、查询、更新、停用和恢复用户。
5. Super Admin 可以创建、查询、更新、停用和删除空 Organization。
6. Super Admin 可以修改普通用户的 Platform、Organization、Permission 和 Skill 访问范围。
7. 前端登录、组织管理、用户管理和权限管理页面使用真实 API，不回退到 Mock 或静态数据。
8. 后端对可预期错误返回明确状态和错误信息；未知错误保留 Trace ID 并在服务端记录完整原因。

本阶段在新分支开发，不直接修改 `master`。

## 2. 明确不做

为控制后端规模，本期不实现：

- Role CRUD、角色模板和角色继承。
- Organization Admin 管理后台。
- DataScope 管理界面。
- 手机验证码、邮箱验证码、MFA 和单点登录。
- Refresh Token 和多设备会话管理。
- 密码找回和管理员密码重置。
- 审批流、临时授权和授权有效期。
- 物理删除用户。
- 使用现有 Cloudflare Worker 作为认证后端。

当前静态角色、成员和权限演示页不应被当作后端需求来源；只有本文件列出的接口属于 MVP。

## 3. 当前状态

### 3.1 已具备的前端基础

- Bearer Token 保存与请求 Header 注入。
- `/api/currentUser` 身份加载。
- Platform 与 Organization 两个独立授权域。
- Organization 请求的 `X-Organization-Id` 注入。
- 登录落点、组织选择和 Workspace 路由保护。
- 多账号、多组织权限组合的 Mock 测试。

### 3.2 当前阻塞

| 问题 | 影响 |
| --- | --- |
| Demo 登录不验证密码、不返回 JWT | 真实登录无法完成 |
| Demo `currentUser` 固定为管理员 | 无身份隔离 |
| 无 MySQL Schema 和持久化 | 用户和权限无法修改 |
| 无后端认证、授权中间件 | 只能依赖前端隐藏 |
| 注册表单仍发送旧验证码字段 | 与新接口不一致 |
| 用户和权限页面使用静态数组 | CRUD 不可用 |
| OpenAPI 仍是旧结构 | 前后端类型不一致 |
| 运行期 401 未统一处理 | Token 失效后状态不完整 |
| 生产 API 仍可能使用公共 Demo 地址 | 存在错误回退风险 |

### 3.3 字段冲突分析与统一结果

| 冲突点 | 原接口/现有前端 | 统一结果 |
| --- | --- | --- |
| 用户主键 | `userid` 与 `userId` 并存 | API 全部使用 `userId`；MySQL 使用 `id/user_id` |
| 展示名称 | API `name`、数据库 `display_name` | API 使用 `name`，Repository 映射 `display_name` |
| 登录账号 | 请求字段 `username`，但需求支持邮箱 | 使用 `account`，值可为 username 或 email |
| 登录成功响应 | 登录字段位于顶层，其他接口有 `success/data` | 统一 `ApiSuccess<LoginData>` |
| 旧登录字段 | `type/autoLogin/status/currentAuthority` | 从新契约删除，不做双字段兼容 |
| 注册邮箱 | 原契约可选、计划必填 | 统一必填 |
| 注册展示名称 | 原契约缺失 | `name` 必填，后端不从 username 静默生成 |
| 用户状态 | 注册 `status: ok` 与数据库状态混用 | 统一 `active/disabled/deleted` |
| Super Admin | 原契约只靠权限数组表达 | 增加只读 `isSuperAdmin`，后台接口按数据库标记鉴权 |
| 默认组织空值 | 可选字段与数据库 NULL 混用 | API 统一 `defaultOrganizationId: string \| null` |
| 权限写模型 | 直接复用 `OrganizationAccess` | 使用精简 `OrganizationAccessAssignment`；读模型仍为 `OrganizationAccess` |
| 列表响应 | 数组、`data`、`total` 结构不一致 | 统一 `ApiSuccess<PageResult<T>>` |
| 失败响应 | `HTTP 200 + success:false` 与真实错误状态并存 | 统一真实 HTTP 状态和 `ApiError` |

当前代码和 Mock 仍保留部分旧字段；实施时由 OpenAPI、后端和前端在同一变更中一次性迁移。文档不为旧字段定义长期 Fallback。

## 4. 技术方案

### 4.1 后端

- Node.js 22 或更高版本。
- Express 5。
- TypeScript strict。
- MySQL 8.0 或更高版本。
- InnoDB、`utf8mb4`、UTC 时间。
- `mysql2/promise` 连接池和参数化查询。
- 版本化 SQL Migration，不在启动时自动修改生产 Schema。
- 独立 `server/package.json` 和 `server/package-lock.json`。

建议的最小依赖：

| 能力 | 建议 |
| --- | --- |
| HTTP | Express 5 |
| MySQL | `mysql2/promise` |
| 输入校验 | Zod 或同等级 Schema 校验 |
| JWT | `jose` 或同等级标准 JWT 库 |
| 密码哈希 | Argon2id |
| 测试 | 单元测试、API 集成测试、独立测试库 |

不引入完整 ORM、消息队列、缓存服务和微服务拆分。

### 4.2 前后端连接

- 本地 Express API 默认监听独立端口。
- Umi 开发代理将 `/api/*` 转发到本地 Express API。
- 生产 API Base URL 必须来自环境配置。
- 生产配置缺失时构建或启动失败，不回退到公共 Demo API。
- Mock 只能由明确的开发命令启用，关闭 Mock 后不得自动恢复静态数据。

### 4.3 目标架构

```text
Ant Design Pro
    │
    │ Authorization: Bearer <access-token>
    │ X-Organization-Id: <organization-id> 仅 Organization API
    ▼
Node.js + Express API
    ├── Environment Validation / Health Check
    ├── CORS / Trace ID / Error Handler
    ├── Request Schema Validation
    ├── JWT Authentication Middleware
    ├── Super Admin Authorization Middleware
    ├── Platform / Organization Authorization Boundary
    ├── Auth / CurrentUser Routes
    ├── Admin User / Access Routes
    ├── Service Transaction Boundary
    └── MySQL Repository Layer
            │
            ▼
        MySQL 8+ / InnoDB
```

调用边界：

- Route 只消费关联契约定义的 camelCase DTO。
- Service 负责用户、授权和事务规则。
- Repository 负责参数化 SQL 以及 snake_case/camelCase 映射。
- 前端不提交权限码参与业务 API 鉴权；只有 Super Admin 授权接口可以提交完整授权快照。
- 后端每次业务请求都以数据库实时状态为准，不能信任前端缓存。

## 5. 核心数据模型

目标模型保留用户、组织、直接授权、角色、Skill 和 DataScope 的完整边界。MVP 首期只启用用户、组织、成员关系和直接授权表；暂未启用的角色相关表保留在目标架构中，不从文档删除。

### 5.1 `users`

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定用户 ID |
| `username` | 规范化后的唯一用户名 |
| `email` | 规范化后的唯一邮箱 |
| `display_name` | 显示名称 |
| `avatar_url` | 可空头像 URL；MVP 不提供上传接口 |
| `password_hash` | Argon2id 密码哈希 |
| `status` | `active / disabled / deleted` |
| `is_super_admin` | Super Admin 标记 |
| `default_organization_id` | 有效默认组织，可为空 |
| `token_version` | 强制旧 Token 失效 |
| `created_at / updated_at / deleted_at` | UTC 时间 |

### 5.2 `organizations`

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定 Organization ID |
| `code` | 唯一业务编码 |
| `name` | 展示名称 |
| `status` | `active / disabled` |
| `created_by` | 创建 Organization 的 Super Admin；旧数据可为空 |
| 时间字段 | 创建和更新时间 |

### 5.3 `organization_members`

| 字段 | 说明 |
| --- | --- |
| `organization_id` | Organization |
| `user_id` | 用户 |
| `status` | `active / disabled` |
| 时间字段 | 创建和更新时间 |

`organization_id + user_id` 唯一。该表决定用户能否进入 Organization。

### 5.4 `user_access_grants`

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `user_id` | 被授权用户 |
| `scope_type` | `platform / organization` |
| `organization_id` | Organization Scope 必填，Platform Scope 必须为空 |
| `grant_type` | `permission / skill` |
| `grant_code` | Permission Code 或 Skill Code |
| `created_by` | 执行授权的 Super Admin |
| `created_at` | 创建时间 |

同一用户、Scope、Organization、Grant Type 和 Grant Code 组合唯一。

### 5.5 目标模型保留表

以下表属于目标 RBAC / Skill / DataScope 架构。首期 Super Admin 直接授权不要求立即创建全部表，但后续扩展必须沿用这些边界，不能把角色、权限和数据范围混入 `users` JSON 字段。

| 表 | 用途 | 首期状态 |
| --- | --- | --- |
| `roles` | Platform 或 Organization 角色 | 保留设计，首期不启用 Role CRUD |
| `permissions` | Permission Code 目录 | 首期由代码 Allowlist 提供，后续可持久化 |
| `role_permissions` | 角色与 Permission 关系 | 保留设计 |
| `user_role_assignments` | 用户在 Platform 或 Organization 的角色 | 保留设计 |
| `skills` | Platform / Organization Skill 目录 | 首期由代码 Allowlist 提供 |
| `role_skill_grants` | 角色与 Skill 关系 | 保留设计 |
| `data_scopes` | Organization 内 Department、Team、Project 等数据范围 | 保留设计 |
| `member_data_scopes` | Organization Member 可用 DataScope | 保留设计 |

目标表核心字段：

- `roles`：`id`、`scope_type`、`organization_id`、`code`、`name`、`description`、`built_in`、`status`、时间字段。
- `permissions`：`code`、`scope_type`、`name`、`description`、`status`。
- `role_permissions`：`role_id`、`permission_code`，组合唯一。
- `user_role_assignments`：`user_id`、`role_id`、`organization_id`、时间字段。
- `skills`：`code`、`scope_type`、`name`、`description`、`status`。
- `role_skill_grants`：`role_id`、`skill_code`，组合唯一。
- `data_scopes`：`id`、`organization_id`、`code`、`name`、`type`、`status`。
- `member_data_scopes`：`organization_id`、`user_id`、`data_scope_id`、`is_default`。

未来启用 Role 时，后端把直接 Grant 与 Role Grant 计算为有效权限，但 `/api/currentUser` 的输出字段保持不变；前端不得感知权限来自直接授权还是角色授权。

### 5.6 数据库与 API 字段映射

| MySQL | API JSON |
| --- | --- |
| `id` / `user_id` | `userId` |
| `display_name` | `name` |
| `avatar_url` | `avatar` |
| `is_super_admin` | `isSuperAdmin` |
| `default_organization_id` | `defaultOrganizationId` |
| `organization_id` | `organizationId` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |
| `deleted_at` | `deletedAt` |

旧前端字段 `userid` 必须一次性迁移为 `userId`。禁止同时返回两种字段，禁止使用 `userId ?? userid` 作为长期 Fallback。

### 5.7 授权码来源

- Permission Code 和 Skill Code 使用后端代码中的固定 Allowlist。
- Super Admin 只能从 Allowlist 选择，不能提交任意字符串创建新权限。
- 未知 Code 返回 400，不忽略、不保存、也不自动降级。
- `/api/admin/access-catalog` 向前端返回可选 Code 和说明。

MVP 沿用当前核心权限：

```text
platform:user:manage
platform:permission:grant
platform:organization:create
platform:organization:update
platform:organization:delete

organization:user:manage
organization:role:manage
organization:permission:grant
organization:settings:update
```

## 6. Super Admin 边界

- Super Admin 由受控 Seed 或部署初始化流程创建。
- 注册接口永远不能创建 Super Admin。
- 普通用户更新接口不能修改 `is_super_admin`。
- Super Admin API 必须同时验证 JWT、用户状态和数据库中的 Super Admin 标记。
- 禁止 Super Admin 删除或停用自己。
- 禁止删除或停用系统最后一个有效 Super Admin。
- 本期不提供通过 UI 提升其他 Super Admin 的能力。

受控初始化命令：

```bash
cd server
npm run seed:super-admin
```

命令要求显式提供 `SUPER_ADMIN_USERNAME`、`SUPER_ADMIN_EMAIL`、`SUPER_ADMIN_NAME` 和
`SUPER_ADMIN_PASSWORD`。密码只作为一次性进程环境变量提供，不写入 `.env`、命令参数、日志或
Git。Seed 在一个事务中创建用户、`is_super_admin` 标记、Platform Permission 与全部 Platform
Skill Grant；迁移会为既有 Super Admin 幂等补齐缺失的 Platform Skill Grant。已存在任意 Super
Admin 时明确失败，不静默更新或提升现有用户。

## 7. 用户注册与登录

### 7.1 注册

```http
POST /api/register
```

请求：

```json
{
  "username": "user1",
  "email": "user1@example.com",
  "name": "用户一",
  "password": "example-password"
}
```

规则：

- 用户名、邮箱和展示名称必填；用户名和邮箱唯一。
- API 字段固定为 `username/email/name/password`，与 `RegisterRequest` 一致。
- 密码强度由前后端分别校验，后端是最终标准。
- `confirm` 只在前端验证，不发送到后端。
- 不发送手机号、前缀和验证码字段。
- 注册成功创建 `active` 普通用户，不自动授予任何权限。
- 注册成功不自动登录、不返回 JWT。
- 无权限用户登录后进入明确的“暂无访问权限”状态。

### 7.2 登录

```http
POST /api/login/account
```

- 请求字段固定为 `account/password`；`account` 可以是用户名或邮箱。
- 成功响应固定为 `ApiSuccess<LoginData>`，Token 位于 `data.accessToken`。
- 不再发送或返回旧字段 `type`、`autoLogin`、`status` 和 `currentAuthority`。
- 使用用户名或邮箱查找用户。
- 统一校验密码和用户状态。
- 成功后签发短期 Access JWT。
- JWT 至少包含 `sub`、`iss`、`aud`、`iat`、`exp`、`jti` 和 `tokenVersion`。
- 未知用户、错误密码和停用用户使用同一登录失败响应，避免账号枚举。

### 7.3 登录态恢复

```text
读取本地 Token
  → GET /api/currentUser
  → 成功：恢复用户和授权
  → 401：清除 Token 和用户状态，跳转登录
  → 403：保留登录态，展示无权限
  → 网络或 5xx：明确展示错误和重试入口
```

## 8. API 范围

### 8.1 认证

| 方法 | 路径 | 认证 | 用途 |
| --- | --- | --- | --- |
| POST | `/api/register` | 否 | 注册普通用户 |
| POST | `/api/login/account` | 否 | 账号密码登录 |
| POST | `/api/password/forgot` | 否 | 请求一次性密码重置凭证 |
| POST | `/api/password/reset` | 否 | 使用一次性凭证设置新密码 |
| GET | `/api/currentUser` | Bearer JWT | 获取当前用户和实时授权 |
| PUT | `/api/users/me/default-organization` | Bearer JWT | 保存默认组织 |
| POST | `/api/login/outLogin` | Bearer JWT | 退出确认；Redis 撤销启用前明确返回未撤销状态 |

认证请求与响应直接使用关联契约中的 `RegisterRequest`、`RegisterData`、`LoginRequest`、`LoginData` 和 `AuthCurrentUser`，本计划不定义兼容版本。

### 8.2 Super Admin 用户 CRUD

所有接口要求有效 Super Admin 身份。

当前实现阶段只开放 `GET /api/admin/users`。POST、PATCH、DELETE 路径已预留并明确返回
`501 FEATURE_NOT_IMPLEMENTED`，不会写入数据库；详情查询与写操作留待后续阶段实现。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/admin/users` | 分页、搜索、按状态查询用户 |
| POST | `/api/admin/users` | Super Admin 创建普通用户 |
| GET | `/api/admin/users/:userId` | 查询用户详情 |
| PATCH | `/api/admin/users/:userId` | 更新用户名、邮箱、显示名或状态 |
| DELETE | `/api/admin/users/:userId` | 软删除用户并使 Token 失效 |

恢复被停用或软删除用户使用 PATCH 明确更新状态，不增加单独恢复端点。

- 列表和详情统一返回契约中的 `AdminUser`。
- Super Admin 创建使用 `CreateUserRequest`，必须明确提交 `status`。
- 更新使用 `UpdateUserRequest`，至少包含一个允许字段。
- `isSuperAdmin`、`userId` 和时间字段只读，不能通过普通 PATCH 修改。

### 8.3 用户访问权限

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/admin/users/:userId/access` | 查询用户完整授权 |
| PUT | `/api/admin/users/:userId/access` | 原子替换用户完整授权 |
| GET | `/api/admin/access-catalog` | 查询可授予权限和 Skill |
| GET | `/api/admin/organizations` | 查询可选择的 Organization |

PUT 请求示例：

```json
{
  "platformPermissions": [],
  "platformSkillCodes": [],
  "organizations": [
    {
      "organizationId": "org-1",
      "permissions": [
        "organization:user:manage"
      ],
      "skillCodes": [
        "file-review"
      ]
    }
  ]
}
```

该请求和响应统一使用关联契约中的 `UserAccessSnapshot`；管理写模型不包含 `organizationCode`、`organizationName` 或 `dataScopes`。

更新规则：

- 请求表示目标用户的完整授权快照，不是增量 Patch。
- 后端先验证所有 Organization、Permission 和 Skill。
- 任一字段无效时返回错误，整笔事务不写入。
- 验证通过后，在一个 MySQL 事务中更新 Membership 和 Grant。
- 更新成功后目标用户下一次请求 `/api/currentUser` 即获得新权限。
- 撤销关键访问权限时递增目标用户 `token_version`，要求重新登录。

### 8.4 Super Admin 组织 CRUD

所有接口要求有效 Super Admin 身份。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/admin/organizations` | 查询 Organization 目录全集 |
| POST | `/api/admin/organizations` | 创建 Organization |
| PATCH | `/api/admin/organizations/:organizationId` | 更新名称或状态 |
| DELETE | `/api/admin/organizations/:organizationId` | 物理删除空 Organization 或仅含初始化访问的 Organization |

- `organizationCode` 创建后不可修改，后端统一保存为大写。
- POST 在同一事务中写入 Organization、创建者 Membership、`organization:*` 和全部 Organization Skill Grant。
- 新建的 `active` Organization 会在刷新 `/api/currentUser` 后立即出现在创建者的可进入组织中；`disabled` Organization 启用后才会返回。
- PATCH 至少提交 `organizationName` 或 `status` 之一，未知字段直接返回 400。
- DELETE 前在事务内锁定 Organization，并检查 `organization_members` 和 `user_access_grants`。
- 只有创建者唯一 Membership 和完整初始化 Grant 时，DELETE 才会在事务内先清理这些初始化记录；出现其他成员、额外授权或不完整初始化数据时返回 `409 ORGANIZATION_IN_USE`。
- 前端组织管理目录只使用该接口；`currentUser.organizations` 仅用于判断当前用户能否进入某个 Organization Workspace。

### 8.5 列表约定

`GET /api/admin/users` 支持：

- `page`
- `pageSize`
- `keyword`
- `status`
- 后端定义的排序白名单

非法分页、状态和排序字段返回 400，不采用默认排序掩盖非法输入。

## 9. `/api/currentUser` 生成规则

1. 验证 JWT 签名、Claims 和 `tokenVersion`。
2. 查询用户，确认状态为 `active`。
3. Super Admin 返回管理中心所需 Platform 权限。
4. 普通用户查询 Platform Grants。
5. 查询有效 Organization Membership。
6. 对每个 Organization 独立查询 Permission 和 Skill Grants。
7. 只返回有效 Organization。
8. 默认组织不再有效时返回 `defaultOrganizationId: null`，不选择其他组织作为隐式回退。
9. MVP 的 `dataScopes` 返回空数组，`defaultDataScopeId` 返回 `null`，不伪造默认 DataScope。

禁止：

- 从 Organization 权限推导 Platform 权限。
- 跨 Organization 合并权限。
- 因为前端发送某个权限码而放行。
- Token 无效时返回默认管理员。
- 数据库错误时返回空权限数组并继续运行。

## 10. 错误处理与 Fallback 原则

### 10.1 标准错误响应

```json
{
  "success": false,
  "errorCode": "ACCOUNT_ALREADY_EXISTS",
  "errorMessage": "用户名已存在",
  "details": {
    "field": "username"
  },
  "traceId": "019f34df-ba75-77a1-97b9-cd2b0056bec8"
}
```

- `details` 只用于安全的字段校验信息，可省略。
- SQL、堆栈、密码、Token 和内部路径只记录在服务端，不返回客户端。
- 前端展示 `errorMessage`，并在排查信息中展示 `traceId`。

### 10.2 HTTP 状态

| HTTP | 用途 |
| --- | --- |
| 400 | 参数、字段、Permission 或 Organization 非法 |
| 401 | 缺少、无效、过期 Token 或登录失败 |
| 403 | 已认证但不是 Super Admin，或无业务权限 |
| 404 | 用户或资源不存在 |
| 409 | 用户名/邮箱冲突、最后一个 Super Admin 等状态冲突 |
| 500 | 未分类服务端错误 |
| 503 | 数据库不可用或依赖未就绪 |

禁止使用 `HTTP 200 + success: false` 表达失败。

### 10.3 禁止静默降级

- API Base URL 缺失时不得回退公共 Demo API。
- 数据库连接失败时服务启动失败或健康检查失败，不使用内存数组。
- JWT 校验失败时不得回退匿名用户、默认用户或管理员。
- 用户查询失败时不得返回空列表伪装成功。
- 权限查询失败时不得返回空权限继续渲染。
- 未知 Permission 或 Skill 不得忽略。
- 接口错误不得回退 Mock、缓存快照或页面静态数据。
- Catch 块不得吞掉错误；必须继续抛出、转换为标准错误或明确记录。
- 未分类异常返回 500 和 Trace ID，完整堆栈只写服务端日志。
- 前端不得用空数组和“暂无数据”掩盖 API 失败；错误态和空数据态必须分开。

允许的有限恢复行为：

- 注销审计接口失败后仍清理本地 Token，但必须记录或显示注销审计失败。
- 网络错误允许用户手动重试，不自动切换到 Mock。
- 401 统一清理登录态；403 保留登录态并展示权限错误。

## 11. 后端目录

```text
server/
├── migrations/
├── src/
│   ├── index.ts
│   ├── app.ts
│   ├── config/
│   │   └── env.ts
│   ├── db/
│   │   ├── pool.ts
│   │   └── transaction.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── superAdmin.ts
│   │   ├── traceId.ts
│   │   ├── validate.ts
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── currentUser.ts
│   │   └── adminUsers.ts
│   ├── services/
│   │   ├── authService.ts
│   │   ├── currentUserService.ts
│   │   └── adminUserService.ts
│   ├── repositories/
│   ├── schemas/
│   ├── permissions/
│   │   └── catalog.ts
│   └── utils/
├── tests/
├── package.json
├── package-lock.json
└── tsconfig.json
```

职责：

- Route 只解析请求并返回响应。
- Schema 校验 Body、Params 和 Query。
- Service 处理业务规则和事务。
- Repository 只执行参数化 MySQL 查询。
- Middleware 统一处理 JWT、Super Admin、Trace ID 和错误。

## 12. 前端工作项

### 12.1 注册和登录

- 注册表单调整为用户名、邮箱、展示名称、密码、确认密码。
- 移除手机号和验证码 Payload。
- 登录表单字段从旧 `username` 映射为契约字段 `account`。
- 登录成功读取 `response.data.accessToken`，不再判断 `status === 'ok'`。
- 登录使用真实 Express API。
- 登录成功后必须加载 `/api/currentUser` 才能进入 Workspace。
- 增加统一 401 和并发退出保护。
- API 失败显示错误，不回退静态登录用户。

### 12.2 Super Admin 用户管理

- Platform 用户页面接入分页 API。
- 提供创建、编辑、停用、恢复和软删除操作。
- 用户访问编辑界面直接编辑 Platform 与 Organization 授权快照。
- 保存权限成功后刷新用户详情和必要的当前用户状态。
- 明确区分 Loading、Empty、Error 和 Forbidden。

### 12.3 OpenAPI

- 更新 `config/oneapi.json`，覆盖注册、登录、CurrentUser、用户 CRUD 和访问权限。
- OpenAPI 统一生成 `userId`，并删除 `userid/currentAuthority/access` 等旧认证字段。
- 所有成功响应生成 `ApiSuccess<T>`，列表生成 `ApiSuccess<PageResult<T>>`。
- 运行 `npm run openapi` 生成前端 Service。
- 禁止直接修改 `src/services/ant-design-pro/`。

### 12.4 现有代码字段迁移清单

| 文件/区域 | 当前字段或行为 | 目标 |
| --- | --- | --- |
| `config/oneapi.json` | `userid`、旧 `LoginResult` | 生成 `userId`、`ApiSuccess<LoginData>` 和 Admin DTO |
| `src/services/auth.ts` | 手写 Token 与 CurrentUser 扩展 | 契约稳定后改用 OpenAPI 生成类型 |
| `src/pages/user/login/index.tsx` | 提交 `username/type/autoLogin`，读取顶层 `status/accessToken` | 提交 `account/password`，读取 `data.accessToken` |
| `src/pages/user/register/*` | `mail/mobile/captcha/prefix/confirm` Payload | 只提交 `username/email/name/password` |
| `src/app.tsx` | 旧生成 `API.CurrentUser` 基础类型 | 使用包含 `userId/isSuperAdmin/status` 的新类型 |
| `src/components/WorkspaceTabsHeader/index.tsx` | 读取 `currentUser.userid` | 读取 `currentUser.userId` |
| `src/hooks/useWorkspaceTabs.ts` | 注释和调用链引用 `userid` | 统一引用 `userId` |
| `mock/user.ts` | `userid/access/currentAuthority` 和非统一响应 | 迁移为统一 DTO 和 `ApiSuccess<T>`，仅供显式 Mock 模式 |
| `src/pages/user/register/_mock.ts` | 返回 `data.status=ok` | 返回 `ApiSuccess<RegisterData>` |
| 相关测试与 Snapshot | 断言旧字段和旧登录结构 | 与统一契约同步更新 |

迁移提交必须覆盖上表全部消费者，避免一半新字段、一半旧字段的中间状态进入主分支。

## 13. 安全要求

- 生产环境只允许 HTTPS。
- Secret 由部署环境注入，不进入仓库。
- 密码使用 Argon2id，并限制密码输入长度防止资源滥用。
- 登录和注册接口增加速率限制。
- MySQL 应用账号使用最小权限。
- CORS 只允许配置的前端 Origin。
- CORS 允许实际需要的 `GET, POST, PUT, PATCH, DELETE, OPTIONS`。
- 所有查询使用绑定参数。
- 用户软删除、状态变化和授权更新必须使用事务。
- 写接口记录操作者、目标用户、动作、Trace ID 和结果。

## 14. 测试与验收

### 14.1 注册和认证

- 注册成功，密码不以明文保存。
- 重复用户名或邮箱返回 409 和明确字段。
- 非法 Payload 返回 400 和字段错误。
- 正确密码登录并签发 JWT。
- 错误密码、未知用户和停用用户登录失败。
- 缺失、损坏、过期或 `tokenVersion` 不匹配返回 401。

### 14.2 Super Admin

- 普通用户访问任意 `/api/admin/*` 返回 403。
- Super Admin 可以完成用户列表、创建、详情、更新、停用和恢复。
- 用户不能删除自己。
- 最后一个 Super Admin 受到保护。
- 删除用户后旧 Token 立即失效。

### 14.3 权限更新

- 能原子替换 Platform 和多个 Organization 授权。
- 未知 Permission、Skill 或 Organization 返回 400。
- 部分输入错误时数据库没有部分写入。
- Organization A 的权限不会出现在 Organization B。
- 撤权后 `/api/currentUser` 和业务 API 同时拒绝访问。

### 14.4 错误与无 Fallback

- 数据库断开时返回 503，不返回空用户列表。
- 配置缺失时后端启动失败并明确指出缺失项。
- 生产 API 配置缺失时不请求公共 Demo API。
- 前端 API 失败展示 Error，不展示静态用户数据。
- 未知异常返回 500 和 Trace ID，客户端看不到堆栈或 SQL。

## 15. 实施顺序

1. MySQL Migration、连接池、环境校验和健康检查。
2. 统一错误、Trace ID、请求校验和 CORS。
3. 用户注册、密码哈希、JWT 和 `currentUser`。
4. Super Admin Seed 和保护中间件。
5. Super Admin 用户 CRUD。
6. 访问目录和用户完整授权替换事务。
7. 前端注册、登录、用户管理和权限编辑接入。
8. OpenAPI、自动化测试和部署配置。

每一步必须先有失败测试或明确验收条件，再进入下一步。

## 16. 合入 `master` 的完成标准

- 用户可以注册并使用真实 MySQL 账号登录。
- Super Admin 可以完成用户 CRUD 和权限修改。
- 普通用户无法访问 Super Admin API。
- 后端不依赖 Cloudflare Demo、Mock 或内存用户数组。
- 所有失败使用正确 HTTP 状态和标准错误响应。
- 前端明确区分错误态和空数据态。
- 未发现静默 Catch、默认管理员或权限查询失败后的空数组 Fallback。
- OpenAPI 与实现一致，生成目录未手工修改。
- 前端 lint、antd lint、typecheck、test 全部通过。
- 后端 lint、typecheck、unit 和 integration test 全部通过。
- PR 包含 MySQL Migration、部署变量、健康检查和补偿回滚步骤。

## 17. 待确认事项

在实现前只剩以下产品选择需要确认：

1. 注册成功后普通用户是否立即为 `active`；本计划默认立即激活但没有任何权限。
2. 用户登录是否同时支持用户名和邮箱；本计划默认两者都支持。
3. Access Token 有效期；建议使用较短有效期并通过 `tokenVersion` 强制失效。
4. MySQL 的具体部署环境、备份和恢复责任。
