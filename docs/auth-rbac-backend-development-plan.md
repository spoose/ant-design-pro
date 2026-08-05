# 认证与 RBAC 后端现状和后续计划

> 状态：已合入主开发基线，继续迭代
>
> 更新：2026-08-05
>
> 集成分支：`main`
>
> 详细接口：[认证与权限 API 契约](./backend-auth-api-bearer-only.md)

本文记录已经落地的架构、当前缺口和后续实施顺序，不重复 API 请求/响应 DTO。接口细节以 API 契约和后端代码为准。

## 1. 目标与边界

当前目标是提供可独立运行的认证与权限后端，支持：

- 普通用户注册、登录、登录态恢复、退出和密码重置；
- Bearer Token 认证和数据库实时状态校验；
- Platform 与 Organization 两级授权；
- Super Admin 组织管理和用户查询；
- 前端通过 `/api/currentUser` 获取统一的身份及访问范围。

当前阶段不实现完整角色模板、DataScope 规则引擎、服务端 Token 撤销列表和审计查询界面。这些能力保留数据与接口扩展方向，但不能被描述为当前可用功能。

## 2. 已落地现状

### 2.1 后端与运行环境

- 独立 `server/` Node.js 应用，Express 5 + TypeScript strict。
- MySQL 8 + `mysql2/promise`，迁移脚本位于 `server/migrations/`。
- Zod 负责请求体、路径参数和查询参数校验。
- Argon2id 保存密码哈希，`jose` 签发和校验 HS256 JWT。
- CORS 使用显式来源白名单；JSON 请求体限制为 1 MB。
- `/health/live` 与 `/health/ready` 分离进程存活和数据库就绪状态。
- `DeepSeek` 与 `Firecrawl` 是 AI 功能的可选配置，不属于认证服务启动的必需条件。

### 2.2 数据模型

当前迁移已建立：

| 表 | 作用 |
| --- | --- |
| `users` | 账号、密码哈希、状态、Super Admin 标记、默认组织、`token_version` |
| `organizations` | 组织编码、名称、状态和创建者 |
| `organization_members` | 用户与组织的 Membership 及状态 |
| `user_access_grants` | Platform/Organization 范围内的 Permission 与 Skill Grant |
| `password_reset_tokens` | 一次性密码重置 Token 摘要、过期与使用状态 |

已执行的迁移职责：

1. `001_initial_schema.sql`：建立用户、组织、Membership 和 Grant 基础结构；
2. `002_password_reset_tokens.sql`：加入一次性密码重置 Token；
3. `003_super_admin_organization_bootstrap.sql`：记录组织创建者并补齐 Super Admin Platform Skill；
4. `004_organization_grant_membership_integrity.sql`：清理孤立 Organization Grant，并通过组合外键绑定 Grant 与 Membership。

核心不变量：

- Platform Grant 的 `organization_id` 必须为 `NULL`；Organization Grant 必须带组织 ID。
- Organization Grant 必须存在对应的 `(organization_id, user_id)` Membership。
- 移除成员时应在同一事务中先删 Grant，再删 Membership。
- `users.default_organization_id` 是登录偏好，不代表授权。

### 2.3 认证与权限

已经实现：

- 注册、登录、`GET /api/currentUser`；
- 开发模式密码重置和一次性 Token 消费；
- Bearer Token 的 issuer、audience、有效期、JWT ID 与 `tokenVersion` 校验；
- 用户停用或 `tokenVersion` 变化后拒绝旧 Token；
- 当前用户默认组织的授权校验与事务更新；
- Super Admin 中间件实时检查用户状态和 `isSuperAdmin`；
- Platform 与 Organization Permission/Skill 的实时聚合。

当前 `/api/currentUser` 已保留 DataScope 字段，但固定返回空数组和 `null`，尚无 DataScope 管理能力。

### 2.4 管理接口

已经实现：

- Super Admin 用户分页查询；
- 组织列表、创建、更新和受约束删除；
- 创建组织时原子写入创建者 Membership 与初始组织授权。

已经注册但返回 `501`：

- 用户新增；
- 用户更新；
- 用户删除。

尚未注册：

- 单个用户详情；
- 用户授权快照和授权更新；
- Permission、Skill、DataScope 目录；
- DataScope 管理。

完整路由状态不在本文重复维护，见 API 契约的“当前接口状态”。

### 2.5 OpenAPI 与前端

- `openapi/jushu-api.json` 已覆盖注册、登录、当前用户和默认组织。
- 前端生成服务位于 `src/services/ant-design-pro/`，只允许通过 `npm run openapi` 更新。
- 密码重置与 Super Admin 管理接口尚未全部进入 OpenAPI；在补齐契约前，管理端不能假设这些调用已生成。

## 3. 当前主要缺口

### P0：补齐可用的后台用户管理

1. 明确用户生命周期：创建、停用、恢复、软删除及其 `tokenVersion` 行为；
2. 实现用户详情查询；
3. 实现用户新增、更新和删除，移除现有 `501` 占位；
4. 为写操作补充并发与唯一键冲突测试；
5. 更新 OpenAPI 并重新生成前端服务。

完成标准：管理端不再依赖占位接口，所有用户写操作都有授权、校验、事务和测试覆盖。

### P0：补齐授权管理闭环

1. 定义授权目录响应，明确哪些 Permission/Skill 可在 Platform 或 Organization 范围使用；
2. 实现用户授权快照查询；
3. 实现授权替换或差量更新，确保 Organization Grant 受 Membership 约束；
4. 明确 Super Admin 自身权限变更的保护规则；
5. 权限变更后确定是否递增 `tokenVersion`，并统一前端刷新策略。

完成标准：管理员可以读取并更新授权，`/api/currentUser` 能立即反映结果，不存在孤立 Grant 或越权写入。

### P1：生产安全与运维

- 接入生产密码重置邮件交付，生产环境绝不返回重置 Token；
- 为登录、密码重置和高风险管理接口增加限流；
- 增加结构化安全审计记录与查询能力；
- 设计服务端 Token 撤销机制，使退出可返回 `serverTokenRevoked: true`；
- 建立 JWT Secret 轮换、数据库备份恢复和迁移回滚流程；
- 将关键 4xx/5xx、登录失败和管理操作接入监控告警。

### P2：角色与 DataScope

- 评估是否需要 Role/Role Binding，避免在授权规模尚小时过早抽象；
- 定义 DataScope 模型、规则表达和与业务查询的强制结合点；
- 实现目录、授权、默认 DataScope 与审计；
- 在真正实现前继续保持 `dataScopes: []` 和 `defaultDataScopeId: null`，不做静默模拟。

## 4. 实施约束

### 4.1 授权边界

- 客户端传入的用户、组织或范围 ID 只作为目标，不作为授权证据。
- Organization 业务请求必须同时校验活动用户、活动组织和活动 Membership。
- Super Admin 是平台管理身份，不等于自动进入任意组织业务范围。
- 无权限读取组织时，避免通过“存在但无权限”和“不存在”的差异泄露目录。
- 所有权限写操作应由后端目录校验，不能保存任意字符串授权码。

### 4.2 数据一致性

- 多表创建、删除和授权替换必须使用事务。
- 唯一性主要由数据库约束保证，服务层负责映射为稳定错误码。
- 删除 Membership 前必须先删除对应 Organization Grant。
- 停用与删除必须明确区分；软删除用户不得继续通过认证。
- 新迁移只向前追加，不修改已经部署的历史迁移。

### 4.3 API 与文档

- 运行时路由和 Schema 是事实来源；文档必须区分“已实现”“501 占位”和“未注册”。
- 新接口先补测试和 OpenAPI，再生成前端服务。
- 不手工编辑 `src/services/ant-design-pro/`。
- API DTO 只在契约文档维护，本文只记录范围、优先级和完成标准。

## 5. 验证基线

后端改动至少执行：

```bash
cd server
npm run typecheck
npm test
npm run build
```

涉及前端或 OpenAPI 时，再执行：

```bash
npm run openapi
npm run lint
npx antd lint ./src
npm run test
npm run build
```

涉及数据库时还应在临时数据库中验证：

- 全新数据库按顺序执行全部迁移；
- 已有数据升级不会产生孤立 Grant；
- 迁移失败时事务和恢复步骤可控；
- 组织创建、删除和默认组织更新满足并发场景的不变量。

## 6. 下一阶段建议顺序

1. 补齐用户详情和用户写接口；
2. 补齐授权目录、授权快照和授权更新；
3. 扩展 OpenAPI 并完成管理端联调；
4. 接入生产密码重置交付、限流和审计；
5. 根据真实业务查询需求再设计 Role 与 DataScope。

每一阶段都应满足：接口状态明确、Schema 严格、失败码稳定、关键事务有测试、OpenAPI 与实现同步，然后再合入 `main`。
