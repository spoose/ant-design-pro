# 登录 -> 首页渲染 链路说明

- **目的**：回答"用户从提交登录到首页渲染完成，代码与请求如何流动"。
- **受众**：需要理解认证/落点/路由守卫链路的开发者。
- **范围**：`/user/login` 表单提交 -> `POST /api/login/account` -> Token 落盘 -> `POST /api/currentUser/get` -> 落点计算 -> 路由守卫 -> 首页组件渲染。冷启动刷新、首页后的业务请求不在范围内。
- **产出技能**：`flow-visualizer`（场景）+ `graphviz`（图源）。
- **相关文件**：`login-to-home-flow.dot`（图源）、`login-to-home-flow.svg`（本地有 Graphviz 时可再生成）。

## 阅读顺序

1. 先看 `login-to-home-flow.dot` 的主路径（实线）：UI -> 前端函数链 -> HTTP -> 后端 -> 返回 -> 路由 -> 首页。
2. 再看红色虚线失败分支：登录失败、Token 401、路由无权。
3. 按下文列出的源码路径核对各步骤；当前登录入口以 `src/services/auth-session/index.ts` 和 `src/services/auth-backends/` 为准。

## 链路走读

1. **提交登录**：`LoginForm` 的 `onFinish` 触发 `handleSubmit()`（`src/pages/user/login/index.tsx`）。
2. **签发 Token**：`loginWithPassword()` -> OpenAPI 生成的 `login()` 发起 `POST /api/login/account`；后端 `createAuthRouter` -> `authService.login()` -> `accessTokenService` 签发 JWT。
3. **Token 落盘**：前端 `setAccessToken()` 写入 `localStorage['ant-design-pro.access-token']`，登录态从此跨刷新可恢复。
4. **拉取授权快照**：`fetchUserInfo()` 调用 `POST /api/currentUser/get`；请求拦截器（`requestErrorConfig.ts`）自动附加刚保存的 Bearer Token，后端 `authenticate` 中间件校验 JWT 后返回 `AuthCurrentUser`（身份 + Platform 权限 + 可进入的 Organization）。
5. **写入全局状态**：`setInitialState` 把 `currentUser` 写入 Umi `@@initialState`。
6. **单一落点门面**：`resolveLandingPath()` 依据授权快照计算唯一落点：`/workspace/platform/overview`（平台）、`/workspace/org/:organizationId/home`（组织）或 `/workspace/access-pending`（无权）。
7. **路由守卫**：目标路由的 `wrappers: ['@/wrappers/workspaceAccess']` 用纯规则 `resolveWorkspaceRouteDecision()` 判定 allow / redirect / forbidden / not-found。
8. **首页渲染**：`layout()` 提供 ProLayout 壳（菜单、顶栏、`onPageChange` 兜底），`<Outlet/>` 渲染首页组件；组织首页 `Home` 为纯客户端渲染，平台工作台由 `workspace/platform/index.tsx` 组合各卡片组件。

## 关键失败路径

- 登录接口失败：`catch` 分支清 Token 并用 notification 展示 `getAuthErrorDetails()` 结构化错误。
- `/api/currentUser/get` 401：`handleAccessTokenFailure()` 清 Token 并回登录页（初始化与运行期共用同一错误码规则）。
- 未登录访问受保护页：`onPageChange` 兜底 `replace('/user/login?redirect=...')`。

## 局限

- 手机号登录标签存在但后端暂不支持，未画入主路径。
- 时序细节（各请求耗时）需运行时 trace 验证，本图仅表达静态代码链路。
