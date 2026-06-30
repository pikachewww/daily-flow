# 一点

前后端分离的小型打卡项目，支持 Web 前端和微信小程序前端。数据由后端 API 持久化到 SQLite，不再使用浏览器 `localStorage`。

Daily Flow is a minimalist daily check-in app designed to help you build better habits by tracking learning, health, and personal growth.

## 项目结构

```text
ai-health-checkin/
  frontend/
    web/              # Web 前端
    miniprogram/      # 微信小程序前端
  backend/
    src/              # Express API + SQLite
    .env.example
  docs/
    API.md
    DEPLOYMENT.md
  README.md
```

## 技术栈

- 前端 Web：原生 HTML/CSS/JavaScript
- 小程序：原生微信小程序
- 后端：Node.js HTTP API
- 数据库：SQLite
- AI 总结：OpenAI / Gemini / Claude / DeepSeek Provider 预留，无 Key 时自动使用本地规则

这样选择的原因：项目很小，原生前端最快最稳；Node.js 后端部署生态成熟，当前实现零外部依赖，能减少个人项目长期维护和部署风险；SQLite 对个人长期打卡数据足够简单稳定，后续迁移 PostgreSQL 成本也低。

## 本地运行

### 1. 后端

```bash
cd backend
cp .env.example .env
npm install
npm run init-db
npm run dev
```

后端默认运行在：

```text
http://localhost:3001
```

### 2. 前端 Web

新开一个终端：

```bash
cd frontend
npm install
npm run dev
```

访问：

```text
http://localhost:5173
```

## 环境变量

后端环境变量见：

```text
backend/.env.example
```

前端 Web 的 API 地址在：

```text
frontend/web/config.js
```

微信小程序的 API 地址在：

```text
frontend/miniprogram/utils/config.js
```

## 功能

- 首页打卡
- 学习记录
- 今日总结
- 历史记录
- 数据统计
- AI 总结生成
- 数据库存储
- 参数校验
- 全局错误处理
- 日志
- CORS
- 环境变量
- 数据库初始化

## 接口文档

见 [docs/API.md](./docs/API.md)。

## 部署文档

见 [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)。

## 生产构建

Web 前端部署前可按正式后端地址构建：

```bash
cd frontend
API_BASE_URL=https://your-backend.onrender.com/api npm run build
```

构建产物会输出到：

```text
frontend/dist
```
