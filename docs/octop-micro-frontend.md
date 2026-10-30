# 工作台内嵌 octop

左侧 `octop` 菜单打开右侧完整 Octop 页面，顶部复用工作台应用标签。每个 Scope 内重复点击只激活同一个标签；切走或关闭时卸载，返回时重新挂载，不额外保活。

## 入口与启动

工作台通过 `qiankun-v3` 别名固定使用 `qiankun@3.0.0-rc.22`，保留 Umi 自带的 qiankun 2，不启用 Umi 的 qiankun master 插件。

需要先在 Octop 功能工作树的 `dashboard/` 中构建并启动预览：

```sh
BASE_URL=http://localhost:8088 npm run build:micro
BASE_URL=http://localhost:8088 npm run preview:micro -- --host 127.0.0.1 --port 4173 --strictPort
```

`BASE_URL` 必须指向实际 Octop API 来源；以上 8088 仅为本地示例。跨域 API 的 CORS、Cookie 和 WebSocket 配置要单独联调。

工作台默认加载 `http://localhost:4173/micro.html`。需要调整时在工作台构建/启动前设置：

```sh
PORT=8010 OCTOP_MICRO_ENTRY=http://127.0.0.1:4173/micro.html npm start
```

这是编译期配置，需要重启工作台开发服务。`OCTOP_BASE_URL` 继续控制已有的独立打开入口，两者分别配置。请勿填写 Octop 的原生 Vite dev 地址或本地 HTML 文件地址；当前验证可用的是 HTTP 构建预览入口。修改 Octop 后手动重新构建，再刷新工作台。

以上示例使用明确的 IPv4 地址，避免 `localhost` 优先访问到其他 IPv6 服务。工作台 Legacy 后端的 `CORS_ORIGINS` 也需要允许实际工作台来源（示例为 `http://localhost:8010`）；Octop 后端单独配置 `cors_origins`，两者不共用白名单。

生产部署时，入口 HTML、模块、动态分块和 CSS 均需允许工作台来源访问。原生 ESM 需要 Chrome/Edge 133+ 或 Safari 18.4+；Firefox 默认不支持，信创浏览器必须按实际内核验证。

## 授权与会话边界

- `octop` 是独立 App Code，菜单、路由和标签继续按当前 Scope 的 `appCodes` 判断。
- XOne 沿用现有 `ALL_APP_CODES` 临时全开策略；Legacy 必须由后端返回 `octop` 授权。前端不根据超级管理员身份追加该授权。
- Legacy 迁移 `011_grant_octop_to_existing_super_admins.sql` 为现有 Super Admin 补齐平台 `octop` 授权；新建 Super Admin 的平台应用目录也包含 `octop`。组织工作区不自动授予。
- 本步不传工作台 Token，不自动登录 Octop，不改变既有“小One”SSO 或独立打开入口。
- 工作台账号与 Octop 账号没有绑定。Octop 使用自己的 Token；嵌入时其浏览器存储属于工作台来源，不能直接复用独立页面其他端口的 localStorage。工作台退出或切换账号不会同步清除 Octop 登录态。
- 组织切换会重挂载界面，但不会自动隔离或清除 Octop 的 Cookie、存储和服务端会话；这不是租户数据隔离。认证、组织切换后的账号行为和 SSO 仍需后续验证。

## 挂载与销毁

Octop 只在其页面激活后按需加载。快速切换时，新实例等待旧实例完成挂载/卸载；React 销毁页面时将子应用 DOM 临时移到隐藏容器，等待 qiankun 清理完成后再移除，避免 React 19 与 Octop React 18 同时接管节点。

加载失败显示重试入口；明确缺失的浏览器能力显示兼容提示。隐藏容器仅用于异步卸载，不作为保活缓存。标签仍只保存标题、顺序和 URL，不保存子应用组件或业务状态。

## 验证范围与限制

已验证本地 Chrome 下的菜单与单标签行为、Legacy 平台应用授权、Octop 自身登录退出、聊天恢复、会话和模型读取、WeKnora 连接器列表、工作区目录及已有 HTML 文件预览。空闲时切走和关闭标签会移除 Octop 容器，日志记录旧连接关闭；返回可重新挂载并恢复有效登录。CORS 预检、未认证和无效 Token 的 401 响应头，以及固定图片资源来源已单独核对。

工作台已执行 lint、antd 检查、类型检查和生产构建；最小接入版本的前端全量测试为 66 个文件、344 项通过。后续授权目录改动及本次待提交快照的检查结果以提交说明为准。

尚未实现工作台与 Octop 的账号绑定、统一登录、同步退出及组织/租户隔离。未完整验证功能分支独立入口的真实登录和消息发送、生成中切换、上传删除及配置保存、SSO/OIDC 整页跳转、生产子路径部署、实际信创浏览器和长时间连接泄漏。原生 Vite dev 入口与监听重建尚不能作为已验证的嵌入开发方式；qiankun 3 仍为固定的 RC 版本。
