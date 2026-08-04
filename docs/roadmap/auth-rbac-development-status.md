# Auth / RBAC Git 全景与开发进度

> 快照时间：2026-07-26（Asia/Hong_Kong）
>
> 当前分支：`codex/auth-frontend`
>
> 说明：本文记录本地 Git 引用的阶段性快照，未执行远端 `fetch`。提交哈希和
> ahead / behind 数量会随着后续开发变化，继续开发时应同步更新本文。

## 1. 当前结论

- 前端继续在 `codex/auth-frontend` 开发。
- 实验后端只在 `codex/experimental-auth-server` 开发。
- `codex/auth-backend-rbac` 是拆分前的前后端完整恢复点，不再作为日常开发分支。
- `auth-rbac` 是三条 `codex/*` 分支共同使用的基线，本身不包含本轮最新前端或后端提交。
- 当前三个 `codex/*` 分支都只有本地引用，尚未配置 upstream，也尚未推送。
- 写入本文前 `codex/auth-frontend` 工作区干净；写入后只有本文处于未跟踪状态。

## 2. 分支拓扑

```text
auth-rbac @ 5c8bb75c
├── codex/auth-frontend
│   └── 7daaf4f4 feat(auth): integrate frontend authentication and management UI
├── codex/experimental-auth-server
│   └── 8e3ea01f feat(server): add experimental authentication and RBAC service
└── codex/auth-backend-rbac
    └── 028adb2c feat(auth): add Express RBAC backend and management workflows
```

三条分支都比 `auth-rbac` 多一个提交，但这三个提交互相独立：

- `7daaf4f4`：拆分后的前端提交。
- `8e3ea01f`：拆分后的实验后端提交。
- `028adb2c`：拆分前同时包含前端与后端的完整提交。

## 3. 本地分支全景

| 分支 | HEAD | 上游 | 相对进度与用途 |
| --- | --- | --- | --- |
| `codex/auth-frontend` | `7daaf4f4` | 无 | 当前分支；比 `auth-rbac` 前进 1 个纯前端提交 |
| `codex/experimental-auth-server` | `8e3ea01f` | 无 | 比 `auth-rbac` 前进 1 个实验后端提交 |
| `codex/auth-backend-rbac` | `028adb2c` | 无 | 比 `auth-rbac` 前进 1 个前后端混合提交；完整恢复点 |
| `auth-rbac` | `5c8bb75c` | `origin/auth-rbac` | Auth / RBAC 与 Organization Workspace 基线 |
| `feature-tabs` | `eb706ec9` | `origin/feature-tabs` | 已进入 `auth-rbac` 历史；比 `auth-rbac` 少 1 个提交 |
| `select-department-page` | `38c1385f` | `origin/select-department-page` | 更早的登录入口与系统切换阶段；已进入后续分支历史 |
| `master` | `401e293c` | `origin/master` | 与 `origin/master` 一致；当前本地 `upstream/master` 比它前进 6 个提交 |

远端：

- `origin`：`https://github.com/spoose/ant-design-pro.git`
- `upstream`：`https://github.com/ant-design/ant-design-pro.git`

同步 `upstream/master` 会引入框架更新，应作为独立任务处理，不应在当前功能开发中顺手合并。

## 4. 分支内容边界

### 4.1 `codex/auth-frontend`

只跟踪前端相关变更：

- `src/`：认证页面、Workspace 权限与路由、组织管理、人员列表、Skill 展示及测试。
- `config/`：页面路由、主题配置和本地 `/api` 代理。
- `mock/`：保留的 Mock 结构与统一后的 API 字段。
- `public/`：JU SHU 品牌资源和加载界面。
- `DESIGN.md` 与前端速查文档。
- `package.json`：开发启动默认关闭 Mock。

该分支不跟踪任何 `server/` 文件。根 `.gitignore` 在此分支忽略 `/server/`，避免本机
`.env`、`dist` 和依赖缓存污染前端提交。忽略规则不会阻止 Git 在未来 cherry-pick
`8e3ea01f` 时恢复并跟踪后端源码。

拆分时没有带入根 `package-lock.json` 的机械性平台元数据改写，因为根前端依赖没有变化。

### 4.2 `codex/experimental-auth-server`

只包含实验后端和直接相关文档：

- `server/`：独立 `package.json`、锁文件、TypeScript 配置和测试配置。
- Express + MySQL + JWT + Argon2id 后端。
- Migration、Super Admin Seed、环境变量示例。
- 后端 API 契约、开发计划和登录 / 密码重置链路文档。
- `biome.json`：让根 Biome 配置检查服务端源码。

该分支相对 `auth-rbac` 没有修改 `src/`、`config/`、`mock/` 或 `public/`。

### 4.3 `codex/auth-backend-rbac`

保留拆分前的完整状态：

- 同时包含最新前端与实验后端。
- 用于检查拆分是否遗漏文件，或在拆分方案需要撤销时恢复。
- 不建议继续在该分支开发，否则会重新形成前后端混合提交。

拆分验证结果：

- 前端分支的目标前端文件与 `028adb2c` 一致。
- 后端分支的目标后端文件与 `028adb2c` 一致。
- 完整恢复点没有被 reset、revert 或改写。

## 5. 已完成的开发进度

### 5.1 基线能力：`auth-rbac`

- Platform 与 Organization 授权域分离。
- Organization Scope Workspace 与应用标签。
- Workspace 路由、菜单与权限基础设施。
- `userId`、Organization Access、Permission 与 Skill 的前端模型基础。

### 5.2 前端：`codex/auth-frontend`

- 登录、注册、退出登录流程接入 Bearer Token API。
- 忘记密码与重置密码页面及请求链路。
- `/api/currentUser` 登录态恢复、Token 注入和 401 处理。
- 注册或登录错误统一使用可关闭通知，不再伪造成功。
- 无组织、无 Platform 权限用户进入明确的 access-pending 页面。
- Platform、Organization、默认组织与登录落点路由规则。
- Super Admin 组织管理页面的查询、创建、编辑和删除链路。
- Super Admin 全人员分页查询页面。
- 人员新增、修改和删除的前端服务边界预留，但当前不开放写操作。
- Skill Registry 统一查询与 Workspace Skill 展示。
- Super Admin Platform Skill、创建 Organization 后的成员关系与 Skill 展示适配。
- JU SHU 登录内容、Logo、主题颜色、状态色、圆角和管理页面细节。
- 管理顶栏中暂不使用的工作区身份、头像区域通过样式隐藏，代码仍保留。
- 本地开发默认关闭 Mock，并把 `/api` 转发到独立后端。

### 5.3 实验后端：`codex/experimental-auth-server`

- 独立 Node.js + Express + TypeScript 服务。
- MySQL 连接池、参数化 SQL、Repository / Service / Route 分层。
- Zod 请求校验、统一错误包络、Trace ID 与错误处理中间件。
- CORS Allowlist、健康检查和环境变量校验。
- Argon2id 密码哈希与 JWT Access Token。
- 用户注册、登录、当前用户、退出登录接口。
- 一次性密码重置 Token、过期与消费事务。
- Super Admin Seed 与不可由注册接口提升的身份边界。
- Super Admin 组织查询、创建、更新和受约束删除。
- Super Admin 创建 Organization 后自动获得成员关系、组织权限与全部 Organization Skill。
- Super Admin 全人员分页查询。
- 人员新增、修改和删除接口当前只预留边界，尚未实现业务写入。
- MySQL 初始 Schema、密码重置和既有 Super Admin 补齐迁移。

## 6. 验证状态

### 前端拆分提交

- `npm run lint`：通过。
- `npx antd lint ./src --format json`：0 个问题。
- `npm test`：40 个测试文件、172 个测试通过。
- 拆分前完整恢复点的前端生产构建：通过。

### 实验后端拆分提交

- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm test`：12 个测试文件、42 个测试通过。

这些结果证明两个拆分提交可以分别通过各自的静态检查和测试，但不等同于生产部署验收。

## 7. 当前未完成与下一阶段

优先级建议：

1. 在 `codex/auth-frontend` 继续前端任务，并按功能形成小型 Conventional Commit。
2. 在 `codex/experimental-auth-server` 单独实现人员新增、修改、停用 / 恢复和权限快照接口。
3. 完成人员管理写流程的前后端联调、错误状态和权限测试。
4. 再决定实验后端是否保留在当前仓库、使用 `git subtree split` 拆仓，或迁移到独立仓库。
5. 在功能边界稳定后分别发布分支或建立 PR。

当前明确未完成：

- 人员管理的真实新增、修改、删除 / 恢复和权限赋予闭环。
- Organization Admin 自助管理。
- Role CRUD、角色继承和 DataScope 管理界面。
- Refresh Token、多设备会话和 Redis Token 撤销列表。
- 生产邮件发送；密码重置当前只具备本机闭环。
- 生产部署、监控、审计和安全加固验收。
- 将最新 `upstream/master` 框架更新合入当前开发历史。

## 8. 后续操作约定

继续前端：

```bash
git switch codex/auth-frontend
```

继续实验后端：

```bash
git switch codex/experimental-auth-server
```

前后端联调时可以分别启动两个进程，不要求先合并分支。前端通过 `/api` 代理访问本机后端。

如果未来确认要把实验后端带回前端开发分支：

```bash
git switch codex/auth-frontend
git cherry-pick 8e3ea01f
```

执行 cherry-pick 前应先检查目标分支状态，并在合入后重新运行前端和后端完整验证。

若只需查看拆分前全貌：

```bash
git show --stat 028adb2c
```

不要在 `codex/auth-backend-rbac` 上继续日常开发，也不要通过 `git reset --hard` 破坏恢复点。

## 9. Stash 记录

当前存在两个早期本地 Stash：

- `On auth-rbac: chore: preserve local impeccable live tooling`
- `On auth-rbac: wip: impeccable live setup`

它们与本轮前后端拆分不是同一批变更。应用或删除前必须先使用 `git stash show --stat`
和 `git stash show -p` 检查内容，不能直接 `pop`。

## 10. 文档更新规则

以下事件发生后应更新本文：

- 创建、删除、重命名或发布上述开发分支。
- 前端或后端形成新的里程碑提交。
- 人员 CRUD / 权限赋予从“预留”变为“已实现”。
- 后端被拆到独立仓库。
- 合入新的 `master` 或 `upstream/master`。
- 完成 PR、部署或生产安全验收。
