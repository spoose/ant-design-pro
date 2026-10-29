# 工作台进入 Octop

首页保留两个独立入口：「AI助手」直接打开 `OCTOP_BASE_URL`，进入 Octop 普通登录；
相邻的「小One」用于 Octop SSO 登录，点击后前端通过 Umi request 请求
`POST /web/ai/octop/ticket`，由现有请求拦截器携带当前登录 Token。
该请求显式覆盖全局演示 API 的 baseURL，始终走工作台同源的 `/web` 入口；
生产部署需要在工作台网关代理该路径到 XOne。
不在请求体传 organizationId；后端从 Token 的 TenantContext 确定当前组织。
未选组织时，业务码 `602001` 提示用户先切换到具体组织。
切组织应复用现有会话服务，拿到并保存新 Token 后再申请 ticket；不能仅改变页面 URL。

响应 `code === 200` 且包含非空 `data.launchUrl` 后，
在新标签页导航到 XOne 的 `launchUrl`。`data.octopBaseUrl` 是目标 Octop 地址，
不能用于拼接 XOne 的 `/web/ai/octop/launch` 路径。launchUrl 可为相对路径或
配置中的 XOne origin 下的绝对地址；前端保留协议、origin 和 URL 用户凭据校验，
不重复解析并比对返回值中的 ticket，也不重建后端提供的路径或查询参数。
前端先打开空标签页再等待请求，防止异步打开被浏览器拦截；失败时关闭空页并提示。
业务失败保留 XOne 错误码，401 交给共享会话失效处理；SSO 失败不会自动打开普通登录入口。

## 本地实连

`XONE_API_TARGET` 是开发代理目标；`XONE_PUBLIC_BASE_URL` 是浏览器导航的
XOne 地址，两者在本地实连时通常相同。
将仓库根目录 `.env.example` 复制为 `.env.local`，将示例主机名替换为实际地址后启动：

```bash
npm run start:xone
```

`XONE_PUBLIC_BASE_URL` 在构建期注入，修改后需要重启开发服务器或重新构建。
后端返回绝对 launchUrl 而工作台与 XOne 不同源时，必须配置该变量；
不能直接信任响应中的任意 origin 来绕过配置。
工作台与 XOne 在同一个公网网关下部署、且网关正确代理 `/web/**` 时可留空，
此时相对 `window.location.origin` 解析 `launchUrl`。
启动工作台不强制要求该变量；地址是否合法及是否允许跳转，在点击 SSO 入口时校验。
本地通过代理申请 ticket 时，仍应让 launch 导航到后续 OIDC 能识别其 Cookie 的
真实 XOne 入口，避免 Cookie 落到 localhost 而授权端点位于内网域名。

## 验证与后端边界

1. 登录 XOne，点击「小One」。
2. Network 中应出现带 Bearer Token 的 ticket 请求，不包含 organizationId。
3. 新标签页应导航至 XOne 的 launchUrl，后续重定向由后端与 Octop 完成。
4. 请求期间按钮禁用；ticket 失败不应导航到 Octop，也不应遗留空标签页。
5. `602001` 提示切组织；401 返回工作台登录；普通登录入口不申请 ticket。

## 未登录恢复的前置条件

`return_to` 是另一条恢复原 OIDC 授权请求的流程，当前登录页尚未实现。
接入前必须确认 XOne 登录后如何让 `/oidc/authorize` 识别认证状态：
有效的 SSO Cookie 或后端明确提供的一次性交接机制。
仅把 Token 存入 localStorage，再导航到授权地址不会自动附带 Bearer 请求头。
确认机制后再实现以 XOne origin 解析的安全回跳，保留原授权查询参数，
并与普通工作台 redirect 分开测试；不能用修正 URL 拼接代替认证状态交接。

若后续跳到 `workbench.example.com`，需要后端修正
`xone.oidc.workbench-login-url` 等部署配置；若返回 `server_error`，
需要对应请求的服务端日志。前端拿到 ticket 不代表整条 SSO 链路已经通过。
