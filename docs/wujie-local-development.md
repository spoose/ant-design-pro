# wujie 本地开发与演示

两套模式都使用真实 Legacy 工作台认证。浏览器统一访问 `http://zh-mac.local:8001`；`localhost:8001` 也是允许的来源，但它与 `zh-mac.local:8001` 的登录缓存互不共享。

| 服务 | 开发模式 | 演示模式 | 地址与用途 |
| --- | --- | --- | --- |
| 工作台前端 | 8001 | 8001 | `http://zh-mac.local:8001`，Legacy 模式 |
| Legacy 工作台后端 | 3000 | 3000 | 工作台 `/api` 代理到 `127.0.0.1:3000` |
| Octop 后端 | 8088 | 8088 | `http://zh-mac.local:8088`，API / WebSocket；演示时同时提供普通构建页面 |
| Octop Vite 开发入口 | 5174 | 不启动 | `http://zh-mac.local:5174/`，热更新及 API / WebSocket 代理 |

原 qiankun 的 8010 / 4173 / 5173 平时不启动，wujie 演示也不再需要 4174。工作台仍使用 Utoopack 开发服务，其附加通信端口可能为 8002；演示模式仅将 Octop 换成构建产物，不等同于完整生产部署。

## 本机准备

两个工作树均使用 `codex/feat-octop-wujie`。下列命令中的目录对应本机工作树。

本机已经为新的工作台工作树建立 `server/.env` 与 `server/node_modules` 的忽略链接，分别复用 `/Users/zhihe/antdesignpro/server/` 中已有的配置和依赖；没有复制或提交凭据。新机器或新工作树应自行安装 server 依赖并配置 `server/.env`（参考 `server/.env.example`），包括 MySQL 和 JWT 参数。

所有启动命令都在前台运行，每个服务使用独立终端，以 `Ctrl+C` 停止。8088 后端只启动一份；它继续使用已有的 Octop 数据配置。首次在新工作树执行 `uv run` 可能安装依赖。

## 开发模式：四个终端

1. Octop 后端：

```bash
cd /Users/zhihe/Octop-worktrees/octop-wujie
bash scripts/run-wujie.sh
```

2. Legacy 工作台后端：

```bash
cd /Users/zhihe/.codex/worktrees/workspace-octop-wujie/antdesignpro
npm run start:wujie:legacy
```

3. Octop 热更新入口：

```bash
cd /Users/zhihe/Octop-worktrees/octop-wujie/dashboard
npm run dev:wujie
```

4. Legacy 工作台前端：

```bash
cd /Users/zhihe/.codex/worktrees/workspace-octop-wujie/antdesignpro
npm run start:wujie
```

访问 `http://zh-mac.local:8001`。工作台通过 5174 加载 Octop；Octop 的 `/api` 和 WebSocket 由 Vite 代理到 8088。独立打开 Octop 也使用同一个 5174，无须再启动独立页面服务。

## 演示模式：先构建，再启动三个服务

先构建 Octop：

```bash
cd /Users/zhihe/Octop-worktrees/octop-wujie/dashboard
npm run build:wujie
```

随后分别在三个终端启动：

```bash
# 终端 1：Octop 后端，同时提供刚构建的普通页面
cd /Users/zhihe/Octop-worktrees/octop-wujie
bash scripts/run-wujie.sh
```

```bash
# 终端 2：Legacy 工作台后端
cd /Users/zhihe/.codex/worktrees/workspace-octop-wujie/antdesignpro
npm run start:wujie:legacy
```

```bash
# 终端 3：工作台前端，直接加载 8088 的 Octop 页面
cd /Users/zhihe/.codex/worktrees/workspace-octop-wujie/antdesignpro
npm run start:wujie:demo
```

访问同一个 `http://zh-mac.local:8001`。不启动 5174 或额外预览服务。Octop 前端变化后重新执行构建；若后端是在首次构建前启动的，需要重启后端以注册页面路由。开发/演示切换时停止原工作台前端，再启动对应命令。

## 入口和跨域配置

- `start:wujie` 固定 Legacy 认证、8001 和 Octop 5174 入口；`start:wujie:demo` 将 Octop 入口改为 8088。
- `dev:wujie` 固定 5174、8088 代理目标以及空 `BASE_URL`；`build:wujie` 也使用空 `BASE_URL`，API 和 WebSocket 从子应用入口推导，不绑定独立开发端口。
- Vite 明确允许 `zh-mac.local:8001`、`localhost:8001`、`127.0.0.1:8001` 三个 HTTP 来源，不再需要命令行 `--cors`。
- `scripts/run-wujie.sh` 固定监听 8088、启用普通页面，并通过 `OCTOP_CORS_ORIGINS` 允许上述三个工作台来源；同时保留本机配置中原有的 localhost / zh-mac.local 的 8010、4173 来源。脚本的列表会覆盖配置文件中的列表；增加其他域名时同步该脚本。
- `start:wujie:legacy` 通过 Node 预加载模块先读取原有 server 环境，再追加上述三个工作台来源；既有 CORS 来源、MySQL 和 JWT 配置继续保留。
- 两个工作台命令都使用 `0.0.0.0` 监听；浏览器使用 `zh-mac.local` 访问。换机器或域名时同步入口与两个服务的来源白名单。

已通过启动参数、Vite 配置解析、Legacy 环境校验与预加载、Octop 后端脚本的替身命令检查；`npm run build:wujie` 普通构建、宿主 lint / antd 检查及改动配置的格式检查通过。检查没有启动业务服务。Legacy 真实数据库登录和 8088 构建页面的完整浏览器联调仍需启动后验收。
