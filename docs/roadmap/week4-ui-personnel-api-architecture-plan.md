# Week 4：UI、人员管理、API 与架构治理计划

> 状态：规划草案，业务需求尚未最终确认
>
> 日期：2026-07-26（Asia/Hong_Kong）
>
> 原则：先收敛生产链路、契约和权限语义，再选择最小纵向切片；不提前开发 Role、DataScope 或完整 CRUD。

## 1. 本周目标

Week 4 聚焦以下四项：

1. 完善现有产品 UI 和关键交互状态。
2. 完善前后端人员管理链路。
3. 统一 API 路径、DTO、响应、错误和分页规范。
4. 审查并整理 WorkspaceScope、权限、请求、数据结构和数据库链路。

本计划不代表人员管理的具体操作范围已经确认。未确认的能力只进入问题清单，不直接实施。

## 2. 当前基线

### 2.1 Platform 人员管理

当前真实只读链路：

```text
GET /api/currentUser
→ Umi initialState
→ getPlatformAccess()
→ platform:user:manage 菜单与路由守卫
→ /workspace/platform/users
→ ProTable
→ GET /api/admin/users
→ Express Auth / Super Admin Middleware
→ Route / Service / Repository
→ MySQL users
```

目前只实现分页查询。人员新增、修改和删除接口仍返回 `501 FEATURE_NOT_IMPLEMENTED`，人员详情、授权快照和授权目录尚未实现。

### 2.2 Organization 成员与角色

`/workspace/org/:organizationId/members` 和 `/roles` 当前仍使用静态演示数据，没有真实 Service、API、数据库查询以及 loading、error、empty 状态。

静态页面不能作为真实人员管理发布。需求确认前应保持明确的占位状态，或暂时隐藏入口。

### 2.3 前后端代码边界

- 当前前端分支：`codex/auth-frontend`
- 当前实验后端分支：`codex/experimental-auth-server`
- 完整恢复点：`codex/auth-backend-rbac`
- 当前前端分支通过根 `.gitignore` 忽略 `/server/`

实验期拆分合理，但长期使用互斥分支作为前后端边界会造成契约、类型、测试和文档漂移。恢复点不应继续作为日常开发分支。

## 3. 已发现的问题

### P0：发布阻断

#### 3.1 生产请求连接错误后端（已修复）

修复前，`src/app.tsx` 在非开发环境会把请求发送到公共 Ant Design Demo Worker。该 Worker 使用旧登录和固定管理员数据，不支持当前 Express/MySQL 的 Bearer、人员管理、组织管理和密码重置契约。

2026-07-26 已完成：

- 所有环境的 Umi request 使用同源 `/api`。
- `UMI_ENV=test` 的开发代理改为本地 Express，不再连接公共 Demo。
- 增加 request `baseURL` 回归测试。

生产部署仍必须由网关或反向代理把同源 `/api` 转发到正式 Express 后端。

#### 3.2 API 存在多套事实来源（治理方案已确认）

当前同时存在：

1. `docs/backend-auth-api-bearer-only.md`
2. 旧模板 `config/oneapi.json`
3. 前端手写 DTO 和页面 Service
4. Express Route、Schema 和 Repository 实现

其中用户主键、登录结构、API namespace 和管理接口已经发生漂移。写接口开发前必须收敛为一份 OpenAPI。

2026-07-26 确认以下治理规则：

1. 新产品 API 的唯一契约文件为 `openapi/jushu-api.json`；采用 JSON 是为了兼容当前 Umi 本地生成器，契约语义仍是 OpenAPI 3.0.3。
2. 采用 OpenAPI 3.0.3，优先兼容现有 Umi OpenAPI 生成链路。
3. 后端负责接口语义、鉴权、状态码和 Schema；任何接口变更先修改并评审 OpenAPI。
4. 前端从该契约生成到 `src/services/jushu-api/`，页面可保留轻量 Service 适配器，但不得重新手写响应 DTO。
5. `config/oneapi.json` 暂时只服务旧模板生成代码，不再添加 JU SHU 认证、Workspace 或人员管理接口。
6. 稳定 OpenAPI 只描述已实现、可测试的接口；尚未实现的接口保留在路线图，不提前生成客户端。
7. 契约统一使用：
   - `userId` 等 camelCase JSON 字段
   - `ApiSuccess<T>` / `ApiError`
   - 真实 HTTP 状态
   - `PageResult<T>`
   - UTC RFC 3339 时间字符串
   - 字符串类型的稳定 ID
8. 前后端分支开发时，契约提交先进入 Integration 基线，再由前端和后端工作区同步。
9. 后续 CI 增加 OpenAPI 校验和生成代码漂移检查。

2026-07-26 已完成首个最小契约切片：

- 建立 `openapi/jushu-api.json`，只包含已实现的注册、登录、`currentUser` 和默认 Organization 更新。
- 新增独立 JU SHU 生成配置，输出到 `src/services/jushu-api/`。
- `npm run openapi` 只生成 JU SHU 产品 API；旧模板保留独立 legacy 命令，避免两个契约互相覆盖。
- 前端认证参数、响应、`AuthCurrentUser`、`OrganizationAccess` 和 `DataScope` 已改用 `JushuAPI` 生成类型。
- `getInitialState`、登录和注册已使用生成请求函数，旧 `API.CurrentUser` 兼容 `Omit` 已删除。

本决策只确定契约治理方式；`/api/admin/*` 或 `/api/platform/*` 的 namespace 以及具体人员 CRUD 仍需单独确认。

#### 3.3 默认 Organization 接口前后端断链（已修复）

选择 Organization 时，前端会调用：

```http
PUT /api/users/me/default-organization
```

现已完成最小闭环：

- Express 路由先校验 Bearer JWT，再校验 UUID 请求体，用户身份只取自 JWT。
- Repository 在事务内校验 User、Membership 和 Organization 均为启用状态，再更新 `users.default_organization_id`。
- Organization 不存在、未启用或当前用户无权访问时，统一返回 `403 ORGANIZATION_FORBIDDEN`，避免泄露 Organization 是否存在。
- OpenAPI 已增加该接口，前端通过重新生成的 `jushu-api/currentUser.ts` 调用，不再手写请求类型和路径。
- 后端 46 项测试、类型检查、构建和真实 MySQL 联调均已通过；联调覆盖更新成功、`currentUser` 回读和越权拒绝。

### P1：权限、Scope 与数据一致性

#### 3.4 前后端授权依据不一致

- 前端根据 `platform:user:manage` 展示人员管理。
- 后端 `/api/admin/*` 根据 `users.is_super_admin` 放行。

如果普通用户获得 `platform:user:manage`，前端可以进入页面，但后端必然返回 403。需要明确采用：

- Super Admin 身份门槛；或
- Platform Permission 能力门槛。

两者不能成为可独立漂移的授权事实源。

#### 3.5 Scope 切换约束与实现不一致

产品和组件注释要求切换 Platform 或 Organization 时整页刷新，以卸载旧 Scope 的组件、请求和内存状态；实际代码使用 `history.push()`。

需要确认是否坚持整页刷新。如果坚持，应恢复真实整页导航，并测试旧请求和标签状态不会跨 Scope 泄漏。

#### 3.6 运行期间的 Token 失效没有统一收口（已修复）

初始化 `GET /api/currentUser` 与运行期业务请求现已复用统一处理器：

- 只识别 `ACCESS_TOKEN_MISSING`、`ACCESS_TOKEN_INVALID` 和 `ACCESS_TOKEN_EXPIRED`。
- 清除本地 Token，保留完整回跳地址，并整页进入登录页。
- 并发失败只触发一次跳转，避免重复消息和导航。
- `BAD_CREDENTIALS` 等其他 401 继续由业务页面处理，不会误清登录态。

#### 3.7 Membership 与 Grant 缺少完整性约束（已修复）

已通过 `004_organization_grant_membership_integrity.sql` 建立
`user_access_grants (organization_id, user_id)` 到
`organization_members (organization_id, user_id)` 的组合外键：

- 迁移前清理没有 Membership 的历史 Organization Grant；Platform Grant 不受影响。
- 创建流程保持 Organization → Membership → Grant 的事务顺序。
- 停用 Membership 或 Organization 只改变状态，保留 Membership 与 Grant。
- 移出成员时必须在同一事务中先删除 Organization Grant、再删除 Membership。
- 重新加入只创建 Membership，不恢复旧 Grant。

由于 `organization_id` 同时是存储生成列 `scope_organization_key` 的基础列，
MySQL 不允许该外键使用 `ON DELETE CASCADE`。因此采用 `ON DELETE RESTRICT`
阻止错误删除，由事务显式删除 Grant；安全性不依赖调用者恰好记住清理孤儿数据。

当前尚未开放成员移出 API。后续实现该 API 时必须复用上述事务顺序，并同时处理
3.8 的默认 Organization 一致性。

#### 3.8 用户与默认 Organization 的一致性不足

`users.default_organization_id` 只保证 Organization 存在，不保证用户仍是有效成员。成员停用、移出或 Organization 停用时，需要同步清理或重新计算默认 Organization。

#### 3.9 用户状态与 Token 生命周期需要绑定

人员停用、软删除和密码变更应同时递增 `token_version`，否则旧 JWT 可能在用户恢复后重新有效。

### P1：数据库迁移与审计

#### 3.10 Migration 失败恢复不稳

当前 Migration 缺少并发锁和校验和；MySQL DDL 与 `schema_migrations` 记录无法形成原子事务。部分 DDL 成功而版本记录失败后，重跑可能因重复字段或外键再次失败。

扩展人员、角色或 DataScope 表前，应先补充：

- Migration 并发锁。
- 文件校验和或结构验证。
- 失败后的 roll-forward 步骤。
- 全新数据库与已有数据库两条 Migration 测试。

#### 3.11 人员写操作缺少完整审计

`created_by` 只能说明授权创建者，不能记录撤权、人员状态变化、修改前后值和操作原因。开放人员写接口前，至少需要可靠的结构化审计日志；如有合规要求，再决定是否建立审计事件表。

### P2：前端与 UI

- Platform 人员页说明承诺“跨组织管理范围”，但接口和表格没有组织范围字段。
- Organization 成员模型把账号、成员关系、角色和 DataScope 压成单值字符串，不适合作为真实 DTO。
- Workspace 页面硬编码中文，而项目启用了多语言和浏览器语言检测。
- 移动端主要依赖表格横向滚动，长邮箱和角色内容缺少结构化适配。
- 人员状态和组织状态使用两套组件与颜色；现有自定义 success 色对不满足 12px 文本的 WCAG AA 对比度要求。
- 人员页测试尚未覆盖搜索、状态筛选、分页、空结果和失败重试。

### P2：维护边界

- `src/services` 被 Biome 整体排除，手写认证 Service 也不会被 lint。
- `ApiSuccess` 与错误解析在多个 Service 中重复。
- `src/app.tsx` 同时承担认证初始化、权限兜底、布局样式和请求环境配置，职责偏重。

以上问题应随 Week 4 实际改动逐步收敛，不做无业务收益的大规模重构。

## 4. Week 4 实施计划

### W4-0：需求与架构决策

目标：形成可执行的最小范围，不写 CRUD。

产物：

- 人员管理对象与操作矩阵。
- Platform 与 Organization 授权边界。
- 用户、Membership、Role、DataScope 的关系说明。
- 删除、停用、恢复和 Token 失效规则。
- 正式后端与集成分支决策。

退出条件：第 9 节的关键问题得到确认，或采用第 10 节的默认最小方案。

### W4-1：生产链路与 API 契约

目标：建立唯一、可验证的前后端契约。

任务：

1. 确认 Express 是否为正式后端。
2. 确定 `/api/admin/*` 或 `/api/platform/*`。
3. 先为以下接口建立 OpenAPI：
   - 登录与注册
   - `currentUser`
   - 默认 Organization
   - Platform 人员列表
   - Platform Organization 列表
4. 统一：
   - `userId` 等字段命名
   - `ApiSuccess<T>` / `ApiError`
   - HTTP 状态与错误码
   - 分页、筛选和排序
   - UTC/RFC 3339 时间
5. 根据 OpenAPI 生成前端类型，逐步删除对应手写重复类型。
6. 修正生产 API Base URL，不允许回退到公共 Demo。

验收：

- OpenAPI、后端实现和前端生成类型一致。
- 登录 → currentUser → 人员列表 smoke test 通过。
- 默认 Organization 接口真实可用。

### W4-2：数据库约束与后端最小切片

目标：只实现已经确认的人员操作。

任务顺序：

1. 人员列表与详情。
2. 可逆的状态变更：停用与恢复。
3. 创建和编辑基本资料。
4. 软删除。
5. 最后再实现完整授权快照。

每个写切片同时验证：

- 请求 Schema。
- 后端真实鉴权。
- 事务边界。
- `token_version` 失效。
- 不能停用或删除自己。
- 不能移除最后一个有效 Super Admin。
- Membership / Grant 一致性。
- 审计记录。

索引不提前堆叠。先根据预估规模和真实数据执行 `EXPLAIN`；当前最可能需要的是 `users(status, created_at, id)`。深分页和全文搜索在数据规模明确后再决定。

### W4-3：前端人员管理与 UI

目标：让已确认的真实链路完整、可信、可恢复。

任务：

- 对接 OpenAPI 生成类型和真实接口。
- 完善 loading、empty、error、retry。
- 完善搜索、筛选、分页和刷新。
- 对危险操作使用明确确认和结果反馈。
- 统一人员与 Organization 的状态组件。
- 修正状态色对比度。
- 优化窄屏表格、长邮箱和操作区。
- 只国际化本周实际修改的页面，不一次性翻译整个模板。
- 删除或隐藏无法反映真实数据的演示内容。

### W4-4：联调、门禁与链路文档

验收链路：

```text
登录
→ currentUser
→ WorkspaceScope
→ 菜单与路由权限
→ 人员列表
→ 已确认的写操作
→ 权限刷新与 Token 失效
```

验证项目：

- Platform 请求不携带 Organization Header。
- Organization 请求携带正确的 `X-Organization-Id`。
- 直接调用无权限 API 返回真实 401/403。
- Scope 切换不会保留旧请求和业务状态。
- 前端 lint、TypeScript、antd lint、测试和构建通过。
- 后端 typecheck、测试、构建和 Migration smoke 通过。
- CI 能检测 OpenAPI 漂移，并分别验证前后端。

## 5. 前后端分开开发策略

### 5.1 结论

合理的分离方式是：

- 按目录和运行进程分离。
- 按 Worktree 和 Codex 任务分离开发上下文。
- 使用一个集成基线验证完整链路。

不建议长期把前端和后端放在互不包含对方代码的分支中。Git 分支表示时间线，不适合作为永久模块边界。

### 5.2 推荐工作区

```text
Frontend Worktree
└─ src/、config/、前端测试

Backend Worktree
└─ server/、Migration、后端测试

Integration Worktree
└─ 同时包含前后端，只做契约、联调和合并验证
```

每个 Worktree 使用独立 Codex 任务，避免前后端上下文、依赖和未提交修改互相污染。

### 5.3 Vibe Coding 切换流程

```text
需求确认
→ OpenAPI 契约提交
→ 后端实现与测试
→ 前端生成类型并接入
→ Integration Worktree 联调
→ 小型 Conventional Commit 合入
```

约束：

- 不在存在未提交修改的目录中频繁 `git switch`。
- 优先使用 `git worktree` 保持前后端上下文。
- API 变更先提交契约，再分别交给后端和前端任务。
- 一个任务只承担一个明确边界。
- 前后端提交保持可单独测试、可小范围回退。
- `codex/auth-backend-rbac` 只作为恢复点，不继续日常开发。

## 6. API 规范建议

### 6.1 已确认的字段规范

以下规则作为人工可读基线，并同步写入 `openapi/jushu-api.json`：

| 范围 | 统一规则 | 示例 |
| --- | --- | --- |
| JSON 字段 | camelCase | `userId`、`createdAt` |
| 数据库列 | snake_case，由 Repository 映射 | `user_id` → `userId` |
| ID | 字符串，名称以 `Id` 结尾 | `organizationId: string` |
| 时间 | UTC RFC 3339 字符串，名称以 `At` 结尾 | `createdAt`、`expiresAt` |
| Boolean | 使用 `is`、`has`、`can` 前缀 | `isSuperAdmin` |
| 数组 | 使用复数名，空集合返回 `[]` | `organizations`、`permissions` |
| 响应空值 | 输出字段保持存在，无值时返回 `null` | `avatar: null` |
| 可选字段 | 只用于请求筛选或 PATCH 语义 | `keyword?`、`status?` |
| 状态枚举 | 小写稳定值 | `active`、`disabled`、`deleted` |
| 错误码 | 大写字符串，不用数字代替 | `VALIDATION_ERROR` |

稳定响应结构：

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

当前核心字段选择：

- 用户主键使用 `userId`，废弃旧模板字段 `userid`。
- 登录请求使用 `account` 和 `password`；`account` 可为用户名或邮箱。
- 用户展示名称使用 `name`；数据库 `display_name` 只属于持久化层。
- 头像字段沿用 `avatar`；数据库 `avatar_url` 由 Repository 映射。
- `email` 在当前注册和用户响应中为必填字符串。
- `defaultOrganizationId`、`defaultDataScopeId`、`deletedAt` 等响应字段使用显式 `null`，不使用省略表示无值。
- 列表统一使用 `list/page/pageSize/total`，不混用 `items/current`。
- 新接口的 `errorCode` 只接受字符串；旧模板的数字错误码仅作为迁移兼容，不进入新 OpenAPI。

### 6.2 路径 namespace 待确认

API 路径应表达授权域，而不是仅表达页面位置。

需要在以下方案中选择一个：

1. `/api/admin/*`：表示接口永远只允许 Super Admin。
2. `/api/platform/*`：表示 Platform 授权域，可由具体 Permission 控制。

Organization API 继续使用 Bearer Token 和 `X-Organization-Id`，但 Scope 分类不能依赖零散的字符串判断。应集中维护 API Scope 规则并增加 Header 测试。

## 7. 数据结构判断

当前以下模型足以支持直接授权 MVP：

- `users`
- `organizations`
- `organization_members`
- `user_access_grants`
- `password_reset_tokens`

需要坚持的边界：

- `User` 表示全局登录账号。
- `OrganizationMembership` 表示账号与 Organization 的关系。
- 用户状态和成员状态独立。
- Permission 与 Skill 是不同 Grant 类型。
- Platform Grant 与 Organization Grant 不能混用。

目前不应提前创建复杂角色体系。只有明确需要多人复用权限模板、角色管理或角色审计时，再启用：

- `roles`
- `role_permissions`
- `user_role_assignments`
- `role_skill_grants`

同理，DataScope 需求未确认前不创建 Department、Team、Project 等数据表和管理界面。

## 8. 本周明确暂缓

- Role CRUD、角色继承和冲突优先级。
- DataScope CRUD 和管理界面。
- Organization Admin 完整管理后台。
- 邀请邮件、MFA、SSO 和审批流。
- Refresh Token 与多设备会话。
- 用户物理删除。
- 完整外部开放 API。
- 大规模拆分 `app.tsx`。
- 立即拆分独立仓库。
- 顺手合并 upstream 框架升级。

## 9. 待确认问题

### 产品范围

1. “人员管理”是否只指 Platform 全局账号？
2. 是否同时包含 Organization 成员管理？
3. Week 4 包含哪些操作：查询、详情、创建、编辑、停用、恢复、软删除、移出 Organization、权限分配？
4. Platform 人员页是否需要展示跨 Organization 归属？

### 权限

5. `platform:user:manage` 是否允许委派，还是永远只允许 Super Admin？
6. 是否允许管理多个 Super Admin？
7. 谁可以提升或撤销 Super Admin？
8. 当前使用直接 Grant，还是本期必须进入 Role？
9. 一个成员是否允许多个 Role 和多个 DataScope？

### 生命周期

10. 是否继续允许公开注册，注册后是否立即为 `active`？
11. `deleted` 是否为可恢复软删除？
12. 软删除后用户名和邮箱是否永久保留？
13. ~~停用成员后是否保留 Grant？~~ 已确认保留，停用期间不生效。
14. ~~恢复成员时是否自动恢复旧 Grant？~~ 已确认停用后恢复；移出后重新加入不恢复。
15. Organization 是否允许物理删除？

### 架构与交付

16. Express 是否作为正式生产后端？
17. Cloudflare Worker 是保留模板演示、改造，还是退役？
18. `/api/admin/*` 与 `/api/platform/*` 采用哪一种语义？
19. Scope 切换是否坚持整页刷新？
20. 前后端最终采用同仓、独立仓，还是短期集成分支？
21. 是否要求本周完成全部语言和移动端完整操作？
22. 是否存在审计保留期限、合规要求或操作原因备注？
23. 预估人员、Organization 和并发管理员规模是多少？
24. API 是否只供内部前端使用，还是未来开放给外部客户端？

## 10. 需求未确认时的默认最小方案

如果暂时没有更细的业务决策，建议采用：

- Express 作为正式后端。
- Cloudflare Worker 不参与认证与人员管理生产链路。
- 保留直接 Grant，不开发 Role 和 DataScope。
- Platform 人员管理实现：
  - 列表
  - 详情
  - 停用
  - 恢复
- Organization 成员管理只实现真实只读列表。
- 删除保持软删除，不开放物理删除。
- Scope 切换使用整页刷新。
- 建立临时 Week 4 Integration Worktree，不改变最终仓库归属。
- 完成真实 API、权限、错误状态和 UI 后，再决定下一组写操作。
