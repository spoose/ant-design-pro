# Workspace 应用授权与渲染

本文说明 Project、Organization 两个 Scope 中，应用代码如何从后端授权进入首页、侧栏和应用页面。

## 稳定前端模型

页面只消费两个字段：

- `currentUser.projectAppCodes`：Project Scope 可使用的应用。
- `currentUser.organizations[].appCodes`：对应 Organization Scope 可使用的应用。

普通业务入口统一称为 **App / 应用**，代码标识称为 **App Code**；首页卡片、快捷入口、
侧栏和标签均使用这一称呼。`skill` 不表示普通应用。Legacy 数据库的应用授权使用
`user_access_grants.grant_type = 'app'`；`skill` 保留给未来的 Agent Skill。

## 当前两套后端

### Legacy

```text
user_access_grants(app)
→ UserRepository
→ POST /api/currentUser/get
→ projectAppCodes / organization.appCodes
→ normalizeAuthCurrentUser()
```

- `drone-operations` 必须来自数据库授权，前端不会根据 `isSuperAdmin` 推导。
- 迁移 `010_grant_drone_operations_to_existing_super_admins.sql` 为现有 Super Admin
  补齐 Project 和已有 Organization 的政务低空授权。
- `integrated-operations` 当前是所有用户的基础应用，由认证归一化层追加；后端正式提供该授权后应删除此前端临时规则。

### XOne

XOne 尚未返回应用授权字段。当前演示阶段由 `normalizeAuthCurrentUser()` 使用
`ALL_APP_CODES` 为 Project 和 Organization 默认开放全部已注册应用。新后端开放应用授权后，
只替换该归一化逻辑，页面组件无需改动。

## 渲染链路

```text
projectAppCodes / organization.appCodes
→ appRegistry
→ WorkspaceHomeModules
├── PlatformQuickEntry（重点应用快捷入口）
├── PlatformAppCatalog（全部应用）
└── WorkspaceAppPage（注册页面或通用占位页）
```

当前新增代码：

| 应用代码 | 名称 | 页面 |
| --- | --- | --- |
| `integrated-operations` | 集约运维 | 通用占位页 |
| `drone-operations` | 政务低空 | Mock 运行总览 |

路由和菜单都通过 `appRegistry` 读取静态标题、图标和导航定义。页面是否可进入仍由当前
Scope 的 `appCodes` 判断，不能只靠手工修改 URL。

## 离线图标

- 快速入口：`public/assets/icons/quick-entry/`
- 全部应用：`public/assets/icons/app-catalog/`

组件只引用 `/assets/icons/...` 本地路径，不再请求远程图片服务，适用于无互联网环境。

## 新增应用检查清单

1. 在 `ALL_APP_CODES` 和 `appRegistry` 注册应用代码。
2. 明确授权来源：数据库 `app` Grant、XOne 归一化或临时基础应用规则。
3. 添加真实页面或明确使用通用占位页。
4. 为快速入口和全部应用补充本地图标。
5. 覆盖注册表、授权归一化、首页链接和目标页面测试。
