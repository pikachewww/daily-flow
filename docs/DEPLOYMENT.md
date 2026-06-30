# 部署方案

推荐方案：

- 前端 Web：Cloudflare Pages
- 微信小程序：微信开发者工具上传发布
- 后端：Render Web Service
- 数据库：Render Persistent Disk 上的 SQLite

选择原因：成本低、部署简单、HTTPS 自动提供、支持环境变量、后端可长期运行，SQLite 对个人打卡数据足够稳定，后续可以平滑迁移到 PostgreSQL。

## 1. 准备 GitHub 仓库

项目当前需要先推送到 GitHub，Render 和 Cloudflare Pages 都可以从 GitHub 自动部署。

```bash
git init
git add .
git commit -m "Initial deployable app"
git branch -M main
git remote add origin https://github.com/pikachewww/daily-flow.git
git push -u origin main
```

## 2. 后端部署到 Render

推荐方式一：使用仓库根目录的 `render.yaml` Blueprint。

1. 打开 Render。
2. New -> Blueprint。
3. 选择 GitHub 仓库。
4. Render 会读取 `render.yaml` 创建后端服务和持久磁盘。
5. 将 `CORS_ORIGIN` 改成你的正式前端域名。

推荐方式二：手动创建 `Web Service`。

1. 在 Render 创建 `Web Service`。
2. 选择仓库，Root Directory 填：

```text
ai-health-checkin/backend
```

3. Build Command：

```bash
npm install
```

4. Start Command：

```bash
npm start
```

5. 添加 Persistent Disk：

```text
Mount Path: /var/data
Size: 1GB
```

6. 配置环境变量：

```text
NODE_ENV=production
NODE_VERSION=22.22.3
PORT=3001
CORS_ORIGIN=https://your-frontend-domain.com
DATABASE_PATH=/var/data/checkin.sqlite
AI_PROVIDER=local
OPENAI_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
CLAUDE_API_KEY=
```

Render 会提供 HTTPS 域名、自动重启、日志和环境变量管理。

## 3. 数据库备份

SQLite 数据库文件位于：

```text
/var/data/checkin.sqlite
```

建议：

- 每周从 Render Shell 下载一次备份。
- 或升级到 Render PostgreSQL / Supabase PostgreSQL 后使用平台自动备份。

个人长期使用首选 SQLite + 持久磁盘；当后续要多用户、登录、数据分析时迁移到 PostgreSQL。

## 4. Web 前端部署到 Cloudflare Pages

1. Cloudflare Pages 创建项目并连接 GitHub 仓库。
2. Root Directory：

```text
ai-health-checkin/frontend
```

3. Build Command：

```bash
npm run build
```

4. Output Directory：

```text
dist
```

5. 在 Cloudflare Pages 环境变量中设置：

```text
API_BASE_URL=https://your-backend.onrender.com/api
```

部署完成后，将前端域名加入后端 `CORS_ORIGIN`。

## 5. 微信小程序发布

1. 打开微信开发者工具。
2. 导入目录：

```text
ai-health-checkin/frontend/miniprogram
```

3. 本地开发时，`utils/config.js` 可以使用：

```js
module.exports = {
  apiBaseUrl: "http://localhost:3001/api"
};
```

在微信开发者工具中勾选“不校验合法域名、web-view、TLS 版本以及 HTTPS 证书”即可本地调试。

4. 正式发布前，在 `utils/config.js` 中配置 HTTPS 后端地址：

```js
module.exports = {
  apiBaseUrl: "https://your-backend.onrender.com/api"
};
```

5. 在微信公众平台配置服务器域名：

```text
request 合法域名：https://your-backend.onrender.com
```

6. 使用真实小程序 AppID 替换 `project.config.json` 里的 `appid`。
7. 在开发者工具中点击“上传”。
8. 到微信公众平台提交审核。
9. 审核通过后发布。

注意：微信小程序正式环境必须使用 HTTPS，不能使用 localhost。

## 6. AI Provider 配置

所有 API Key 只放环境变量，不写入代码：

```text
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...

AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=...

AI_PROVIDER=gemini
GEMINI_API_KEY=...

AI_PROVIDER=claude
CLAUDE_API_KEY=...
```

如果没有配置任何 Key，后端会自动使用本地规则生成总结，功能不会中断。
