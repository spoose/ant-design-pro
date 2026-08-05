# Ant Design Pro pAI Workspace

基于 Ant Design Pro 构建的企业工作台，包含组织级权限、独立认证后端和 pAI 智能助手。
当前主线同时维护 React 前端与 Express 后端，默认分支为 `main`。

## 已实现能力

- Platform / Organization 双层 Workspace 与权限隔离
- JWT Bearer 认证、注册、登录、密码重置和 Super Admin 管理接口
- MySQL 用户、组织、成员关系与授权数据
- 基于 Ant Design X 的 pAI 对话界面
- DeepSeek 模型接入


## 技术栈

| 范围 | 技术 |
| --- | --- |
| 前端 | React 19、Umi Max 4、Ant Design 6、ProComponents 3、Ant Design X |
| 后端 | Node.js、Express 5、TypeScript、Zod |
| 数据库 | MySQL |
| AI | Mastra、DeepSeek、Firecrawl |
| 工程 | Vitest、Biome、utoopack |

## 核心链路

```text
浏览器
├── Workspace / RBAC 页面
└── pAI 对话页面
      ↓ Bearer Token + 完整会话历史
Express API
├── 认证与 Organization 权限
├── MySQL Repository / Service
└── PaiAgentService
      ↓
Mastra pAI Agent
├── DeepSeek
      ↓
项目 SSE：reasoning-delta / text-delta / sources / done
```

## 环境要求

- Node.js 22 或更高版本
- npm（使用仓库中的 `package-lock.json`）
- MySQL
- 可选：DeepSeek API Key、Firecrawl API Key

## 本地启动

### 1. 克隆项目

```bash
git clone https://gitee.com/jushu2026/xone-fronted.git
cd xone-fronted
```

### 2. 安装前后端依赖

```bash
npm ci
cd server
npm ci
```

### 3. 配置后端环境变量

```bash
cp .env.example .env
```

编辑 `server/.env`，至少配置 MySQL 和 JWT：

```dotenv
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=ant_design_pro
MYSQL_USER=ant_design_pro
MYSQL_PASSWORD=replace-with-a-local-secret

JWT_SECRET=replace-with-at-least-32-random-bytes
```

pAI 与联网搜索为可选配置：

```dotenv
DEEPSEEK_API_KEY=sk-
DEEPSEEK_MODEL=deepseek-v4-flash
FIRECRAWL_API_KEY=fc-
```

未配置 DeepSeek 时认证服务仍可运行，但 pAI 模型接口会返回 `503`。未配置 Firecrawl 时
普通对话仍可使用，联网搜索不可用。

### 4. 初始化数据库

在 `server` 目录运行：

```bash
npm run migrate
```

### 5. 启动后端

```bash
npm run dev
```

后端默认地址：`http://localhost:3000`。

### 6. 启动前端

另开终端，在仓库根目录运行：

```bash
npm run dev
```

前端默认地址：`http://localhost:8000`。

## 常用命令

### 前端

```bash
npm run dev
npm test
npm run lint
npx antd lint ./src
npm run build
```

### 后端

```bash
cd server
npm run dev
npm test
npm run typecheck
npm run build
```

## 项目目录

```text
config/       Umi 配置与路由
docs/         架构、认证和 AI 设计文档
openapi/      前端 API 机器契约
server/       Express、MySQL、Mastra 与测试
src/          React 前端应用
```

## 文档

- [认证与权限 API 契约](./docs/backend-auth-api-bearer-only.md)
- [后端认证与 RBAC 开发规划](./docs/auth-rbac-backend-development-plan.md)


## 安全说明

- `.env`、数据库凭据、JWT Secret 和模型 API Key 不得提交到 Git。
- 用户与 Organization Scope 只能来自服务端认证结果。
- pAI Tool 不得绕过权限访问任意文件、SQL 或其他 Organization。
- 生产环境应使用 HTTPS、受控 CORS 和足够强度的 JWT Secret。

## 上游与许可证

前端基础来自 [Ant Design Pro](https://github.com/ant-design/ant-design-pro)。项目沿用仓库中的
[MIT License](./LICENSE)。
