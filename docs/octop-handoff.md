# 工作台进入 Octop

首页「AI助手」直接打开 `OCTOP_BASE_URL`，用于外链对照测试。
相邻的「小One」用于 Octop 单点登录测试，点击后前端通过 Umi request 请求
`POST /web/ai/octop/ticket`，由现有请求拦截器携带当前登录 Token。
该请求显式覆盖全局演示 API 的 baseURL，始终走工作台同源的 `/web` 入口；
生产部署需要在工作台网关代理该路径到 XOne。
请求体固定为 `{"organizationId":1}`：当前仅该组织完成后端 Octop 配置。
后续接入更多组织时，需要同步调整组织选择规则。

响应 `code === 200` 且包含有效的 `data.ticket`、`data.launchUrl` 后，
在新标签页导航到 XOne 的 `launchUrl`。`data.octopBaseUrl` 是目标 Octop 地址，
不能用于拼接 XOne 的 `/web/ai/octop/launch` 路径。
前端先打开空标签页再等待请求，防止异步打开被浏览器拦截；失败时关闭空页并提示。

## 本地实连

`XONE_API_TARGET` 是开发代理目标；`XONE_PUBLIC_BASE_URL` 是浏览器导航的
XOne 地址，两者在本地实连时通常相同。例如：

```bash
XONE_API_TARGET=http://10.20.0.2:18086 \
XONE_PUBLIC_BASE_URL=http://10.20.0.2:18086 \
npm run start:xone
```

`XONE_PUBLIC_BASE_URL` 在构建期注入，修改后需要重启开发服务器或重新构建。
工作台与 XOne 在同一个公网网关下部署、且网关正确代理 `/web/**` 时可留空，
此时相对 `window.location.origin` 解析 `launchUrl`。
本地通过代理申请 ticket 时，仍应让 launch 导航到后续 OIDC 能识别其 Cookie 的
真实 XOne 入口，避免 Cookie 落到 localhost 而授权端点位于内网域名。

## 验证与后端边界

1. 登录 XOne，点击「小One」。
2. Network 中应出现带 Bearer Token 的 ticket 请求，请求体为 organizationId=1。
3. 新标签页应导航至 XOne 的 launchUrl，后续重定向由后端与 Octop 完成。
4. 请求期间按钮禁用；ticket 失败不应导航到 Octop，也不应遗留空标签页。

若后续跳到 `workbench.example.com`，需要后端修正
`xone.oidc.workbench-login-url` 等部署配置；若返回 `server_error`，
需要对应请求的服务端日志。前端拿到 ticket 不代表整条 SSO 链路已经通过。
